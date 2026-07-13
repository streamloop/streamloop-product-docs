# Streamloop support RAG

This workspace builds a support assistant over the Mintlify docs and the production `https://streamloop.app/llms.txt` manifest.

It uses Inkeep OSS for the agent configuration, R2R for production retrieval, and this TypeScript service as the REST/MCP support adapter for Inkeep.

## Setup

```bash
cd support-rag
npm install
cp .env.example .env
npm run llms
npm run index
npm test
npm run eval:dry
npm run dev
```

Do not commit `.env`. Put the OpenRouter key in `.env` only for live answers.

## R2R production stack

The production retrieval path is:

```text
Inkeep OSS
-> support-rag REST/MCP adapter
-> R2R API
-> Postgres + pgvector
-> Postgres full-text + vector hybrid search
-> Snowflake Arctic Embed L v2.0 through Hugging Face TEI
-> GTE ModernBERT reranker through Hugging Face TEI
-> OpenRouter GPT-4.1 mini for final support answers
-> OpenTelemetry traces
```

Start the full stack:

```bash
docker compose up -d postgres tei-embedding tei-reranker r2r otel-collector support-rag
npm run llms
npm run ingest:r2r
ALLOW_LOCAL_FALLBACK=false OPENROUTER_MODEL=openai/gpt-4.1-mini npm run e2e
```

Use Tilt during development:

```bash
tilt up
```

`RAG_BACKEND=r2r` is the default. `ALLOW_LOCAL_FALLBACK=true` lets the service fall back to the local JSON index when R2R is not available, which keeps no-credit tests fast.

## Inkeep

The Inkeep project is defined by:

- `inkeep.config.ts`
- `index.ts`

The configured model is `openrouter/openai/gpt-4.1-mini`, with no fallback models. The support sub-agent uses the custom docs MCP server at `http://localhost:8787/mcp` by default.

After the local Inkeep OSS stack is running, push this project from `support-rag/` with the Inkeep CLI:

```bash
npx @inkeep/agents-cli@0.75.4 push
```

To run the open-source Inkeep dashboard locally:

```bash
npx @inkeep/agents-cli@0.75.4 dev --port 3005 --host 127.0.0.1
```

## Endpoints

- `GET /health`
- `POST /search`
- `POST /answer`
- `POST /mcp`

`npm run llms` syncs the authoritative production manifest from `https://streamloop.app/llms.txt` into the docs root. `npm run ingest:r2r` ingests that manifest and all local docs into R2R as pre-chunked documents. `/answer` uses dry-run mode when `DRY_RUN=true`, returning retrieved citations without spending model credits.

## E2E validation

Run `npm run e2e` after the Docker stack is up and R2R ingestion has completed. The script asserts that:

- `/health` reports R2R retrieval and dry-run is disabled.
- `/search` returns R2R-backed YouTube RTMP citations.
- `/answer` uses the configured OpenRouter support model and cites docs.
- `/mcp` exposes `answer_support_question` and cites `llms.txt` for brand-authority questions.

## Production notes

- Keep `RAG_BACKEND=r2r` for production.
- Keep `LLMS_SOURCE_URL=https://streamloop.app/llms.txt` so brand, pricing, API-surface, and support-routing facts stay grounded in the production manifest.
- Keep `OPENROUTER_MODEL` pinned to an approved support answer model. The default is `openai/gpt-4.1-mini`.
- Keep `OPENROUTER_MAX_TOKENS` small for support answers.
- Put the service behind HTTPS before registering it with Inkeep in production.
- Run `npm run ingest:r2r` whenever docs change.
