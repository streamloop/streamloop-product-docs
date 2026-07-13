import fs from "node:fs/promises";
import path from "node:path";
import type { Chunk } from "./chunk.js";
import { tokenize } from "./tokenize.js";

export type IndexedChunk = Chunk & {
  embedding: number[];
  termCounts: Record<string, number>;
};

export type RagIndex = {
  version: 1;
  builtAt: string;
  docsRoot: string;
  chunkCount: number;
  documentFrequency: Record<string, number>;
  chunks: IndexedChunk[];
};

export async function saveIndex(indexPath: string, index: RagIndex): Promise<void> {
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

export async function loadIndex(indexPath: string): Promise<RagIndex> {
  const raw = await fs.readFile(indexPath, "utf8");
  return JSON.parse(raw) as RagIndex;
}

export function buildDocumentFrequency(chunks: Chunk[]): Record<string, number> {
  const df: Record<string, number> = {};
  for (const chunk of chunks) {
    const uniqueTerms = new Set(tokenize(`${chunk.title} ${chunk.headingPath.join(" ")} ${chunk.text}`));
    for (const term of uniqueTerms) {
      df[term] = (df[term] ?? 0) + 1;
    }
  }
  return df;
}

export function countTerms(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const token of tokenize(text)) {
    counts[token] = (counts[token] ?? 0) + 1;
  }
  return counts;
}
