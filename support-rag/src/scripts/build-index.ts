import { buildIndex } from "../build-index.js";

const index = await buildIndex();
console.log(`Indexed ${index.chunkCount} chunks at ${index.builtAt}`);
