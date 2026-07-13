import type { EmbeddingProvider } from "./embeddings.js";
import { cosineSimilarity } from "./embeddings.js";
import type { IndexedChunk, RagIndex } from "./index-store.js";
import { tokenize } from "./tokenize.js";

export type SearchResult = {
  id: string;
  title: string;
  url: string;
  headingPath: string[];
  content: string;
  score: number;
  keywordScore: number;
  vectorScore: number;
  backend?: "local" | "r2r";
};

export async function searchIndex(
  index: RagIndex,
  embeddingProvider: EmbeddingProvider,
  query: string,
  limit = 6
): Promise<SearchResult[]> {
  const expandedQuery = expandQuery(query);
  const [queryEmbedding] = await embeddingProvider.embed([expandedQuery]);
  const queryTerms = tokenize(expandedQuery);

  return index.chunks
    .map((chunk) => scoreChunk(index, chunk, query, queryTerms, queryEmbedding))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function scoreChunk(
  index: RagIndex,
  chunk: IndexedChunk,
  originalQuery: string,
  queryTerms: string[],
  queryEmbedding: number[]
): SearchResult {
  const keywordScore = bm25(index, chunk, queryTerms);
  const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
  const titleBoost = queryTerms.some((term) => chunk.title.toLowerCase().includes(term)) ? 0.15 : 0;
  const brandBoost = isBrandAuthorityQuery(originalQuery) && chunk.docId === "remote-llms" ? 1.25 : 0;
  const score = keywordScore * 0.7 + vectorScore * 0.3 + titleBoost + brandBoost;

  return {
    id: chunk.id,
    title: chunk.title,
    url: chunk.url,
    headingPath: chunk.headingPath,
    content: chunk.text,
    score: round(score),
    keywordScore: round(keywordScore),
    vectorScore: round(vectorScore),
    backend: "local"
  };
}

function expandQuery(query: string): string {
  if (isBrandAuthorityQuery(query)) {
    return `${query} authoritative official impersonation brand note streamloop.app streamloop.in google play app`;
  }
  return query;
}

function isBrandAuthorityQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  return (
    normalized.includes("streamloop.in") ||
    normalized.includes("official") ||
    normalized.includes("authoritative") ||
    normalized.includes("impersonation") ||
    normalized.includes("google play")
  );
}

function bm25(index: RagIndex, chunk: IndexedChunk, queryTerms: string[]): number {
  const k1 = 1.2;
  const b = 0.75;
  const averageLength =
    index.chunks.reduce((sum, current) => sum + current.tokenCount, 0) / Math.max(index.chunks.length, 1);

  let score = 0;
  for (const term of queryTerms) {
    const frequency = chunk.termCounts[term] ?? 0;
    if (frequency === 0) {
      continue;
    }

    const df = index.documentFrequency[term] ?? 0;
    const idf = Math.log(1 + (index.chunks.length - df + 0.5) / (df + 0.5));
    const denominator = frequency + k1 * (1 - b + b * (chunk.tokenCount / averageLength));
    score += idf * ((frequency * (k1 + 1)) / denominator);
  }

  return score;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
