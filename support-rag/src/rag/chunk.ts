import type { SourceDoc } from "../docs/load-docs.js";

export type Chunk = {
  id: string;
  docId: string;
  title: string;
  url: string;
  headingPath: string[];
  text: string;
  tokenCount: number;
};

export function chunkDocs(docs: SourceDoc[], maxWords = 220, overlapWords = 40): Chunk[] {
  const chunks: Chunk[] = [];

  for (const doc of docs) {
    const sections = splitSections(doc.content);
    let chunkIndex = 0;

    for (const section of sections) {
      const words = section.text.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        continue;
      }

      for (let start = 0; start < words.length; start += maxWords - overlapWords) {
        const slice = words.slice(start, start + maxWords);
        chunks.push({
          id: `${doc.id}#${chunkIndex}`,
          docId: doc.id,
          title: doc.title,
          url: doc.url,
          headingPath: section.headingPath.length > 0 ? section.headingPath : [doc.title],
          text: slice.join(" "),
          tokenCount: slice.length
        });
        chunkIndex += 1;

        if (start + maxWords >= words.length) {
          break;
        }
      }
    }
  }

  return chunks;
}

function splitSections(content: string): Array<{ headingPath: string[]; text: string }> {
  const lines = content.split("\n");
  const sections: Array<{ headingPath: string[]; text: string[] }> = [];
  let headingPath: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      if (current.length > 0) {
        sections.push({ headingPath, text: current });
      }
      const level = heading[1].length;
      headingPath = [...headingPath.slice(0, level - 1), heading[2].trim()];
      current = [heading[2].trim()];
      continue;
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push({ headingPath, text: current });
  }

  return sections.map((section) => ({
    headingPath: section.headingPath,
    text: section.text.join("\n").trim()
  }));
}
