import Fastify from "fastify";
import { z } from "zod";
import { config } from "./config.js";
import { startTelemetry } from "./telemetry.js";
import { answerSupportQuestion } from "./rag/answer.js";
import { SupportRetriever } from "./rag/support-retriever.js";

startTelemetry();

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(12).default(6)
});

const answerSchema = z.object({
  question: z.string().min(1),
  limit: z.number().int().min(1).max(8).default(6)
});

const mcpSchema = z.object({
  jsonrpc: z.literal("2.0").optional(),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.unknown().optional()
});

const app = Fastify({ logger: true });
const retriever = new SupportRetriever();

app.get("/health", async () => ({
  ok: true,
  retrieval: await retriever.health(),
  dryRun: config.dryRun,
  configuredBackend: config.ragBackend
}));

app.post("/search", async (request) => {
  const body = searchSchema.parse(request.body);
  return {
    results: await retriever.search(body.query, body.limit)
  };
});

app.post("/answer", async (request) => {
  const body = answerSchema.parse(request.body);
  const results = await retriever.search(body.question, body.limit);
  return answerSupportQuestion(body.question, results);
});

app.post("/mcp", async (request, reply) => {
  const body = mcpSchema.parse(request.body);

  if (body.method === "initialize") {
    return rpc(body.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "streamloop-support-rag", version: "1.0.0" }
    });
  }

  if (body.method === "tools/list") {
    return rpc(body.id, {
      tools: [
        {
          name: "search_support_docs",
          description: "Search Streamloop support documentation and return cited chunks.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              limit: { type: "number", minimum: 1, maximum: 12 }
            },
            required: ["query"]
          }
        },
        {
          name: "answer_support_question",
          description: "Search docs and draft a cited support answer using the configured approved model unless dry-run is enabled.",
          inputSchema: {
            type: "object",
            properties: {
              question: { type: "string" },
              limit: { type: "number", minimum: 1, maximum: 8 }
            },
            required: ["question"]
          }
        }
      ]
    });
  }

  if (body.method === "tools/call") {
    const params = body.params as { name?: string; arguments?: unknown };
    if (params.name === "search_support_docs") {
      const args = searchSchema.parse(params.arguments ?? {});
      const results = await retriever.search(args.query, args.limit);
      return rpc(body.id, {
        content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }]
      });
    }

    if (params.name === "answer_support_question") {
      const args = answerSchema.parse(params.arguments ?? {});
      const results = await retriever.search(args.question, args.limit);
      const answer = await answerSupportQuestion(args.question, results);
      return rpc(body.id, {
        content: [{ type: "text", text: JSON.stringify(answer, null, 2) }]
      });
    }
  }

  reply.code(400);
  return { error: `Unsupported MCP method: ${body.method}` };
});

function rpc(id: string | number | undefined, result: unknown): unknown {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

await app.listen({ host: "0.0.0.0", port: config.port });
