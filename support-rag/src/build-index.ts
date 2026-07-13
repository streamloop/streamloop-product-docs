import { config } from "./config.js";
import { loadDocs } from "./docs/load-docs.js";
import { loadRemoteLlms } from "./docs/remote-llms.js";
import { chunkDocs } from "./rag/chunk.js";
import { createEmbeddingProvider } from "./rag/embeddings.js";
import { buildDocumentFrequency, countTerms, saveIndex, type RagIndex } from "./rag/index-store.js";

export async function buildIndex(): Promise<RagIndex> {
  const localDocs = await loadDocs(config.docsRoot, config.docsBaseUrl);
  const docs = config.llmsSourceUrl
    ? [await loadRemoteLlms(config.llmsSourceUrl), ...localDocs]
    : localDocs;
  const chunks = chunkDocs(docs);
  const embeddingProvider = createEmbeddingProvider();
  const embeddings = await embeddingProvider.embed(
    chunks.map((chunk) => `${chunk.title}\n${chunk.headingPath.join(" > ")}\n${chunk.text}`)
  );
  const documentFrequency = buildDocumentFrequency(chunks);

  const index: RagIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    docsRoot: config.docsRoot,
    chunkCount: chunks.length,
    documentFrequency,
    chunks: chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
      termCounts: countTerms(`${chunk.title} ${chunk.headingPath.join(" ")} ${chunk.text}`)
    }))
  };

  await saveIndex(config.indexPath, index);
  return index;
}
