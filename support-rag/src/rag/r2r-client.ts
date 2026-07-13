import {
  r2rClient,
  type IndexConfig,
  type VectorSearchResult,
  type WrappedIngestionResponse,
  type WrappedSearchResponse
} from "r2r-js";
import { config } from "../config.js";
import type { SearchResult } from "./search.js";

export type R2RHealth = {
  ok: boolean;
  baseUrl: string;
  projectName: string;
};

type R2RClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  projectName?: string;
  searchMode?: string;
  searchLimit?: number;
};

type R2RSearchResponse = {
  results?: {
    chunk_search_results?: R2RChunkResult[];
    chunkSearchResults?: R2RChunkResult[];
  };
};

type R2RChunkResult = VectorSearchResult & {
  document_id?: string;
};

export class R2RSupportClient {
  private sdk?: r2rClient;

  constructor(private readonly options: R2RClientOptions = {}) {}

  async health(): Promise<R2RHealth> {
    await this.client.system.health();
    return {
      ok: true,
      baseUrl: this.baseUrl,
      projectName: this.projectName
    };
  }

  async search(query: string, limit = this.searchLimit): Promise<SearchResult[]> {
    const response = await retryTransient(() =>
      this.client.retrieval.search({
        query,
        searchMode: this.searchMode as "advanced" | "basic" | "custom",
        searchSettings: this.searchSettings(limit)
      })
    );

    const results = this.chunkResults(response);
    return uniqueResults(results.map((result) => this.toSearchResult(result))).slice(0, limit);
  }

  async ingestChunks(doc: {
    id: string;
    title: string;
    url: string;
    chunks: Array<{ text: string; headingPath: string[]; chunkId: string }>;
  }): Promise<string | undefined> {
    try {
      const response = await this.client.documents.create({
        id: deterministicUuid(doc.id),
        chunks: doc.chunks.map((chunk) => chunk.text),
        metadata: {
          source: "streamloop-support-rag",
          source_id: doc.id,
          title: doc.title,
          url: doc.url,
          heading_paths: doc.chunks.map((chunk) => chunk.headingPath),
          chunk_ids: doc.chunks.map((chunk) => chunk.chunkId)
        },
        ingestionMode: "fast",
        runWithOrchestration: false
      });
      return this.ingestedDocumentId(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("already ingested")) {
        return deterministicUuid(doc.id);
      }
      throw error;
    }
  }

  async createHnswIndex(): Promise<void> {
    try {
      await this.client.indices.create({
        config: {
          table_name: "chunks",
          index_name: "streamloop_chunks_vec_hnsw",
          index_column: "vec",
          index_method: "hnsw",
          index_measure: "cosine_distance",
          index_arguments: {
            m: 16,
            ef_construction: 64
          }
        } as unknown as IndexConfig,
        runWithOrchestration: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("already")) {
        throw error;
      }
    }
  }

  private searchSettings(limit: number): Record<string, unknown> {
    return {
      limit,
      use_hybrid_search: true,
      use_semantic_search: true,
      use_fulltext_search: true,
      include_scores: true,
      include_metadata: true,
      hybrid_settings: {
        fulltext_weight: 1,
        semantic_weight: 1,
        fulltext_limit: Math.max(limit * 4, 20),
        rrf_k: 50
      },
      chunk_settings: {
        enabled: true,
        ef_search: 80
      },
      graph_settings: {
        enabled: false
      }
    };
  }

  private get client(): r2rClient {
    if (!this.sdk) {
      const sdk = new r2rClient(this.baseUrl, false);
      if (this.apiKey) {
        sdk.setApiKey(this.apiKey);
      }
      sdk.setProjectName(this.projectName);
      this.sdk = sdk;
    }
    return this.sdk;
  }

  private chunkResults(response: WrappedSearchResponse | R2RSearchResponse): R2RChunkResult[] {
    const results = response.results;
    const legacyResults = results as R2RSearchResponse["results"] | undefined;
    return results?.chunkSearchResults ?? legacyResults?.chunk_search_results ?? [];
  }

  private ingestedDocumentId(response: WrappedIngestionResponse): string | undefined {
    return response.results?.documentId;
  }

  private toSearchResult(result: R2RChunkResult): SearchResult {
    const metadata = result.metadata ?? {};
    const title = stringValue(metadata.title) ?? "Streamloop docs";
    const url = stringValue(metadata.url) ?? "https://streamloop.app/docs";
    const headingPath = parseHeadingPath(metadata.heading_path ?? metadata.headingPath);

    return {
      id: result.id,
      title,
      url,
      headingPath: headingPath.length > 0 ? headingPath : [title],
      content: result.text,
      score: round(result.score ?? 0),
      keywordScore: 0,
      vectorScore: round(result.score ?? 0),
      backend: "r2r"
    };
  }

  private get baseUrl(): string {
    return this.options.baseUrl ?? config.r2rBaseUrl;
  }

  private get apiKey(): string | undefined {
    return this.options.apiKey ?? config.r2rApiKey;
  }

  private get projectName(): string {
    return this.options.projectName ?? config.r2rProjectName;
  }

  private get searchMode(): string {
    return this.options.searchMode ?? config.r2rSearchMode;
  }

  private get searchLimit(): number {
    return this.options.searchLimit ?? config.r2rSearchLimit;
  }
}

function parseHeadingPath(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return value.split(">").map((part) => part.trim()).filter(Boolean);
    }
  }
  return [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function uniqueResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];
  for (const result of results) {
    const key = `${result.id}:${result.url}:${result.content.slice(0, 160)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(result);
  }
  return unique;
}

function deterministicUuid(input: string): string {
  const bytes = new Uint8Array(16);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    bytes[index % 16] ^= hash & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function retryTransient<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.r2rRequestRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= config.r2rRequestRetries || !isTransientR2RError(error)) {
        throw error;
      }
      await delay(config.r2rRequestRetryMs * (attempt + 1));
    }
  }
  throw lastError;
}

function isTransientR2RError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("connection error") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("temporar") ||
    message.includes("econn")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
