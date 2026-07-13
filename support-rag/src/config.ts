import "dotenv/config";
import path from "node:path";

const root = process.cwd();

export const config = {
  docsRoot: path.resolve(root, process.env.DOCS_ROOT ?? ".."),
  docsBaseUrl: process.env.DOCS_BASE_URL ?? "https://streamloop.app/docs",
  llmsSourceUrl: process.env.LLMS_SOURCE_URL ?? "https://streamloop.app/llms.txt",
  indexPath: path.resolve(root, process.env.INDEX_PATH ?? "./data/index.json"),
  port: Number(process.env.PORT ?? 8787),
  ragBackend: process.env.RAG_BACKEND ?? "r2r",
  allowLocalFallback: process.env.ALLOW_LOCAL_FALLBACK !== "false",
  r2rBaseUrl: process.env.R2R_BASE_URL ?? "http://localhost:7272",
  r2rApiKey: process.env.R2R_API_KEY,
  r2rProjectName: process.env.R2R_PROJECT_NAME ?? "streamloop_support",
  r2rSearchMode: process.env.R2R_SEARCH_MODE ?? "advanced",
  r2rSearchLimit: Number(process.env.R2R_SEARCH_LIMIT ?? 8),
  r2rRequestRetries: Number(process.env.R2R_REQUEST_RETRIES ?? 3),
  r2rRequestRetryMs: Number(process.env.R2R_REQUEST_RETRY_MS ?? 2500),
  postgresUrl: process.env.POSTGRES_URL ?? "postgres://postgres:postgres@localhost:5432/postgres",
  otelServiceName: process.env.OTEL_SERVICE_NAME ?? "streamloop-support-rag",
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  dryRun: process.env.DRY_RUN === "true",
  embeddingProvider: process.env.EMBEDDING_PROVIDER ?? "hash",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL ?? "snowflake-arctic-embed-l-v2.0",
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
  openRouterMaxTokens: Number(process.env.OPENROUTER_MAX_TOKENS ?? 700),
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL ?? "https://docs.streamloop.app",
  openRouterAppName: process.env.OPENROUTER_APP_NAME ?? "Streamloop Support RAG"
};

export function assertSupportModel(model: string): void {
  const allowed = [
    /^openai\/gpt-4\.1-mini$/,
    /^openrouter\/openai\/gpt-4\.1-mini$/,
    /^anthropic\/claude-sonnet-4\.5$/,
    /^openrouter\/anthropic\/claude-sonnet-4\.5$/,
    /^anthropic\/claude-sonnet-4$/,
    /^openrouter\/anthropic\/claude-sonnet-4$/,
    /^google\/gemini-2\.5-flash$/,
    /^openrouter\/google\/gemini-2\.5-flash$/
  ];

  if (!allowed.some((pattern) => pattern.test(model))) {
    throw new Error(`Only approved Streamloop support models are allowed. Received: ${model}`);
  }
}
