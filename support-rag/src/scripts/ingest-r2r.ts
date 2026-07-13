import { config } from "../config.js";
import { loadDocs } from "../docs/load-docs.js";
import { loadRemoteLlms } from "../docs/remote-llms.js";
import { chunkDocs } from "../rag/chunk.js";
import { R2RSupportClient } from "../rag/r2r-client.js";

const localDocs = await loadDocs(config.docsRoot, config.docsBaseUrl);
const docs = config.llmsSourceUrl ? [await loadRemoteLlms(config.llmsSourceUrl), ...localDocs] : localDocs;
const client = new R2RSupportClient();

await client.health();

let ingested = 0;
let skipped = 0;

for (const doc of docs) {
  const chunks = chunkDocs([doc]).map((chunk) => ({
    text: chunk.text,
    headingPath: chunk.headingPath,
    chunkId: chunk.id
  }));

  if (chunks.length === 0) {
    skipped += 1;
    console.warn(`Skipped ${doc.relativePath}: no indexable content`);
    continue;
  }

  const documentId = await client.ingestChunks({
    id: doc.id,
    title: doc.title,
    url: doc.url,
    chunks
  });

  ingested += 1;
  console.log(`Ingested ${doc.relativePath} -> ${documentId ?? "unknown document id"} (${chunks.length} chunks)`);
}

await client.createHnswIndex();
console.log(`R2R ingestion complete for ${ingested} documents in project ${config.r2rProjectName}. Skipped ${skipped}.`);
