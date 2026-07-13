import { createServer, type IncomingHttpHeaders } from "node:http";
import { describe, expect, it } from "vitest";
import { assertSupportModel } from "../src/config.js";
import { loadDocs } from "../src/docs/load-docs.js";
import { loadRemoteLlms } from "../src/docs/remote-llms.js";
import { chunkDocs } from "../src/rag/chunk.js";
import { HashEmbeddingProvider } from "../src/rag/embeddings.js";
import { buildDocumentFrequency, countTerms, type RagIndex } from "../src/rag/index-store.js";
import { R2RSupportClient } from "../src/rag/r2r-client.js";
import { searchIndex } from "../src/rag/search.js";

const docsRoot = new URL("../..", import.meta.url).pathname;

describe("docs ingestion", () => {
  it("loads Mintlify docs with titles and URLs", async () => {
    const docs = await loadDocs(docsRoot, "https://docs.streamloop.app");
    expect(docs.length).toBeGreaterThan(10);
    expect(docs.some((doc) => doc.relativePath === "quickstart.mdx")).toBe(true);
    expect(docs.some((doc) => doc.relativePath === "AGENTS.md")).toBe(false);
    expect(docs.some((doc) => doc.relativePath === "CLAUDE.md")).toBe(false);
    expect(docs.every((doc) => doc.title.length > 0)).toBe(true);
  });

  it("loads the authoritative production llms.txt manifest", async () => {
    const doc = await loadRemoteLlms("https://streamloop.app/llms.txt");
    expect(doc.content).toContain("Brand note");
    expect(doc.content).toContain("https://streamloop.app");
    expect(doc.content).toContain("Docs MCP");
  });
});

describe("retrieval", () => {
  it("retrieves YouTube docs for a YouTube streaming question", async () => {
    const docs = await loadDocs(docsRoot, "https://docs.streamloop.app");
    const chunks = chunkDocs(docs);
    const embeddingProvider = new HashEmbeddingProvider();
    const embeddings = await embeddingProvider.embed(chunks.map((chunk) => chunk.text));
    const index: RagIndex = {
      version: 1,
      builtAt: new Date().toISOString(),
      docsRoot,
      chunkCount: chunks.length,
      documentFrequency: buildDocumentFrequency(chunks),
      chunks: chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
        termCounts: countTerms(`${chunk.title} ${chunk.headingPath.join(" ")} ${chunk.text}`)
      }))
    };

    const results = await searchIndex(index, embeddingProvider, "YouTube RTMP stream key live control room", 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((result) => `${result.title} ${result.url}`).join(" ").toLowerCase()).toContain("youtube");
  });

  it("retrieves llms.txt for brand authority questions", async () => {
    const docs = await loadDocs(docsRoot, "https://streamloop.app/docs");
    const llms = await loadRemoteLlms("https://streamloop.app/llms.txt");
    const chunks = chunkDocs([llms, ...docs]);
    const embeddingProvider = new HashEmbeddingProvider();
    const embeddings = await embeddingProvider.embed(chunks.map((chunk) => chunk.text));
    const index: RagIndex = {
      version: 1,
      builtAt: new Date().toISOString(),
      docsRoot,
      chunkCount: chunks.length,
      documentFrequency: buildDocumentFrequency(chunks),
      chunks: chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
        termCounts: countTerms(`${chunk.title} ${chunk.headingPath.join(" ")} ${chunk.text}`)
      }))
    };

    const results = await searchIndex(index, embeddingProvider, "Is streamloop.in an official Streamloop website?", 3);
    expect(results[0]?.url).toBe("https://streamloop.app/llms.txt");
    expect(results[0]?.content).toContain("NOT streamloop.in");
  });

  it("queries R2R with hybrid search and maps chunk results", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    let capturedHeaders: IncomingHttpHeaders | undefined;
    const server = createServer((request, response) => {
      if (request.method !== "POST" || request.url !== "/v3/retrieval/search") {
        response.writeHead(404).end();
        return;
      }

      let rawBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        rawBody += chunk;
      });
      request.on("end", () => {
        capturedHeaders = request.headers;
        capturedBody = JSON.parse(rawBody) as Record<string, unknown>;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            results: {
              chunk_search_results: [
                {
                  id: "chunk-1",
                  score: 0.91321,
                  text: "Use the YouTube Live Control Room RTMP endpoint and stream key.",
                  metadata: {
                    title: "YouTube",
                    url: "https://streamloop.app/docs/platforms/youtube",
                    heading_path: ["Platforms", "YouTube"]
                  }
                }
              ]
            }
          })
        );
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Expected test server to listen on a TCP port");
      }

      const client = new R2RSupportClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
        projectName: "streamloop_support",
        searchMode: "advanced",
        searchLimit: 3
      });
      const results = await client.search("YouTube RTMP stream key");

      expect(capturedHeaders?.["x-project-name"]).toBe("streamloop_support");
      expect(capturedBody?.query).toBe("YouTube RTMP stream key");
      expect(capturedBody?.search_mode).toBe("advanced");
      expect(capturedBody?.search_settings).toMatchObject({
        limit: 3,
        use_hybrid_search: true,
        use_semantic_search: true,
        use_fulltext_search: true
      });
      expect(results[0]).toMatchObject({
        id: "chunk-1",
        title: "YouTube",
        url: "https://streamloop.app/docs/platforms/youtube",
        backend: "r2r",
        score: 0.9132
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});

describe("model guard", () => {
  it("allows only approved support answer models", () => {
    expect(() => assertSupportModel("openai/gpt-4.1-mini")).not.toThrow();
    expect(() => assertSupportModel("anthropic/claude-sonnet-4.5")).not.toThrow();
    expect(() => assertSupportModel("google/gemini-2.5-flash")).not.toThrow();
    expect(() => assertSupportModel("anthropic/claude-haiku-4.5")).toThrow(/Only approved Streamloop support models/);
  });
});
