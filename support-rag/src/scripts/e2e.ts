import assert from "node:assert/strict";

const baseUrl = process.env.SUPPORT_RAG_BASE_URL ?? "http://localhost:8787";
const expectedModel = process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";

type SearchResult = {
  title: string;
  url: string;
  content: string;
  backend?: string;
};

type AnswerResponse = {
  answer: string;
  model: string;
  dryRun: boolean;
  citations: Array<{ title: string; url: string }>;
};

type McpResponse = {
  result?: {
    tools?: Array<{ name: string }>;
    content?: Array<{ type: string; text: string }>;
  };
};

await assertHealthUsesR2R();
await retry("R2R search", assertSearchUsesR2R);
await retry("OpenRouter answer", assertAnswerUsesOpenRouter);
await retry("MCP tooling", assertMcpTooling);

console.log("E2E validation passed: R2R retrieval, OpenRouter answer generation, MCP tooling, and citations are working.");

async function assertHealthUsesR2R(): Promise<void> {
  const health = await fetchJson<{
    ok: boolean;
    dryRun: boolean;
    configuredBackend: string;
    retrieval?: { backend?: string; r2r?: { ok?: boolean; projectName?: string } };
  }>("/health");

  assert.equal(health.ok, true, "health endpoint should be ok");
  assert.equal(health.configuredBackend, "r2r", "configured backend should be r2r");
  assert.equal(health.retrieval?.backend, "r2r", "active retrieval backend should be r2r");
  assert.equal(health.retrieval?.r2r?.ok, true, "R2R health should be ok");
  assert.equal(health.retrieval?.r2r?.projectName, "streamloop_support", "R2R project should be streamloop_support");
  assert.equal(health.dryRun, false, "live E2E must not run in dry-run mode");
}

async function assertSearchUsesR2R(): Promise<void> {
  const body = await postJson<{ results: SearchResult[] }>("/search", {
    query: "How do I connect YouTube with an RTMP stream key?",
    limit: 5
  });

  assert.ok(body.results.length >= 3, "search should return multiple R2R results");
  assert.ok(body.results.every((result) => result.backend === "r2r"), "every search result should come from R2R");
  assert.match(`${body.results[0].title} ${body.results[0].url}`, /youtube/i, "top result should be YouTube-related");
  assert.ok(
    body.results.some((result) => result.url === "https://streamloop.app/docs/platform/youtube-rtmp"),
    "search should retrieve the YouTube RTMP page"
  );
}

async function assertAnswerUsesOpenRouter(): Promise<void> {
  const answer = await postJson<AnswerResponse>("/answer", {
    question: "How do I connect YouTube with an RTMP stream key?",
    limit: 5
  });

  assert.equal(answer.dryRun, false, "answer should be generated live");
  assert.equal(answer.model, expectedModel, "answer should use the configured support model");
  assert.match(answer.answer, /stream key|RTMP/i, "answer should address the stream key setup");
  assert.ok(answer.citations.length >= 3, "answer should return citations");
  assert.ok(
    answer.citations.some((citation) => citation.url === "https://streamloop.app/docs/platform/youtube-rtmp"),
    "answer should cite the YouTube RTMP page"
  );
}

async function assertMcpTooling(): Promise<void> {
  const tools = await postJson<McpResponse>("/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  });
  assert.ok(
    tools.result?.tools?.some((tool) => tool.name === "answer_support_question"),
    "MCP should expose answer_support_question"
  );

  const response = await postJson<McpResponse>("/mcp", {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "answer_support_question",
      arguments: {
        question: "Is streamloop.in an official Streamloop site?",
        limit: 4
      }
    }
  });

  const text = response.result?.content?.find((item) => item.type === "text")?.text;
  assert.ok(text, "MCP answer should return text content");
  const answer = JSON.parse(text) as AnswerResponse;
  assert.equal(answer.dryRun, false, "MCP answer should be generated live");
  assert.equal(answer.model, expectedModel, "MCP answer should use the configured support model");
  assert.match(answer.answer, /not an official|not official|no,/i, "MCP answer should reject streamloop.in");
  assert.ok(
    answer.citations.some((citation) => citation.url === "https://streamloop.app/llms.txt"),
    "MCP answer should cite the authoritative llms.txt manifest"
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function retry(name: string, operation: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 4 || !isTransient(error)) {
        throw error;
      }
      console.warn(`${name} was not ready on attempt ${attempt}; retrying.`);
      await delay(5000 * attempt);
    }
  }
  throw lastError;
}

function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("connection error") ||
    message.includes("internal server error") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("temporar")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
