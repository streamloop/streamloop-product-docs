import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

if (!config.llmsSourceUrl) {
  throw new Error("LLMS_SOURCE_URL is required to sync llms.txt.");
}

const response = await fetch(config.llmsSourceUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch ${config.llmsSourceUrl}: ${response.status} ${await response.text()}`);
}

const body = await response.text();
await fs.writeFile(path.join(config.docsRoot, "llms.txt"), body.endsWith("\n") ? body : `${body}\n`);
console.log(`Synced llms.txt from ${config.llmsSourceUrl}.`);
