import { config } from "../config.js";
import { tokenize } from "./tokenize.js";

export type EmbeddingProvider = {
  embed(texts: string[]): Promise<number[][]>;
};

export function createEmbeddingProvider(): EmbeddingProvider {
  if (config.embeddingProvider === "ollama") {
    return new OllamaEmbeddingProvider(config.ollamaBaseUrl, config.ollamaEmbedModel);
  }
  return new HashEmbeddingProvider();
}

export class HashEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly dimensions = 384) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => normalize(this.embedOne(text)));
  }

  private embedOne(text: string): number[] {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    for (const token of tokenize(text)) {
      const index = positiveHash(token) % this.dimensions;
      vector[index] += 1;
    }
    return vector;
  }
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (const text of texts) {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt: text })
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding request failed: ${response.status} ${await response.text()}`);
      }

      const body = (await response.json()) as { embedding?: number[] };
      if (!body.embedding) {
        throw new Error("Ollama embedding response did not include an embedding.");
      }
      vectors.push(normalize(body.embedding));
    }
    return vectors;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
  }
  return dot;
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

function positiveHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
