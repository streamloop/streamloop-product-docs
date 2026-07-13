import type { SourceDoc } from "./load-docs.js";

export async function loadRemoteLlms(url: string): Promise<SourceDoc> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch llms.txt from ${url}: ${response.status} ${await response.text()}`);
  }

  const content = (await response.text()).trim();
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Streamloop llms.txt";

  return {
    id: "remote-llms",
    filePath: url,
    relativePath: "llms.txt",
    title: `${title} llms.txt`,
    description: "Authoritative Streamloop product and agent context manifest.",
    url,
    content,
    headings: Array.from(content.matchAll(/^#{1,3}\s+(.+)$/gm), (match) => match[1].trim())
  };
}
