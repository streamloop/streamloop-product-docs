import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type SourceDoc = {
  id: string;
  filePath: string;
  relativePath: string;
  title: string;
  description?: string;
  url: string;
  content: string;
  headings: string[];
};

const ignoredDirs = new Set([".git", "node_modules", "support-rag", "drafts", "refs", ".claude"]);
const ignoredFiles = new Set(["AGENTS.md", "CLAUDE.md"]);

export async function listDocFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          await walk(path.join(dir, entry.name));
        }
        continue;
      }

      if (entry.isFile() && !ignoredFiles.has(entry.name) && (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))) {
        results.push(path.join(dir, entry.name));
      }
    }
  }

  await walk(root);
  return results.sort();
}

export async function loadDocs(root: string, baseUrl: string): Promise<SourceDoc[]> {
  const files = await listDocFiles(root);
  const docs: SourceDoc[] = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    const relativePath = path.relative(root, filePath).replaceAll(path.sep, "/");
    const content = stripMdx(parsed.content);
    const title = String(parsed.data.title ?? firstHeading(content) ?? titleFromPath(relativePath));
    const headings = collectHeadings(content);

    docs.push({
      id: relativePath.replace(/\.(mdx|md)$/i, ""),
      filePath,
      relativePath,
      title,
      description: parsed.data.description ? String(parsed.data.description) : undefined,
      url: toUrl(baseUrl, relativePath),
      content,
      headings
    });
  }

  return docs;
}

export function stripMdx(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, (block) => block)
    .replace(/<[^>\n]+>/g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\{#[^}]+\}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function firstHeading(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function collectHeadings(content: string): string[] {
  return Array.from(content.matchAll(/^#{1,3}\s+(.+)$/gm), (match) => match[1].trim());
}

function titleFromPath(relativePath: string): string {
  const base = relativePath.replace(/\.(mdx|md)$/i, "").split("/").pop() ?? "Untitled";
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toUrl(baseUrl: string, relativePath: string): string {
  const slug = relativePath.replace(/(^|\/)index\.mdx?$/i, "").replace(/\.(mdx|md)$/i, "");
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return slug ? `${normalizedBase}/${slug}` : normalizedBase;
}
