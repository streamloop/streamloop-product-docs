import { config } from "../config.js";
import { createEmbeddingProvider } from "./embeddings.js";
import { loadIndex, type RagIndex } from "./index-store.js";
import { R2RSupportClient } from "./r2r-client.js";
import { searchIndex, type SearchResult } from "./search.js";

export class SupportRetriever {
  private readonly r2r = new R2RSupportClient();
  private readonly localEmbeddingProvider = createEmbeddingProvider();
  private localIndex?: RagIndex;

  async health(): Promise<Record<string, unknown>> {
    if (config.ragBackend === "r2r") {
      try {
        return {
          backend: "r2r",
          r2r: await this.r2r.health()
        };
      } catch (error) {
        if (!config.allowLocalFallback) {
          throw error;
        }
        return {
          backend: "local-fallback",
          reason: error instanceof Error ? error.message : String(error)
        };
      }
    }

    const index = await this.ensureLocalIndex();
    return {
      backend: "local",
      chunkCount: index.chunkCount
    };
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    if (config.ragBackend === "r2r") {
      try {
        return await this.r2r.search(query, limit);
      } catch (error) {
        if (!config.allowLocalFallback) {
          throw error;
        }
      }
    }

    const index = await this.ensureLocalIndex();
    return searchIndex(index, this.localEmbeddingProvider, query, limit);
  }

  private async ensureLocalIndex(): Promise<RagIndex> {
    if (!this.localIndex) {
      this.localIndex = await loadIndex(config.indexPath);
    }
    return this.localIndex;
  }
}
