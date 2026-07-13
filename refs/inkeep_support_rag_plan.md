# Inkeep support RAG plan

## Research summary

The open-source Inkeep Agents framework is the agent and UI orchestration layer, not a bundled enterprise docs search product. Its docs show that agents are made of sub-agents, sub-agents can use MCP tools, and an MCP tool can point at a deployed custom server URL. Inkeep also documents OpenRouter as a supported model provider and requires a base model at the project level.

Sources reviewed:

- `https://docs.inkeep.com/concepts`
- `https://docs.inkeep.com/typescript-sdk/agent-settings`
- `https://docs.inkeep.com/typescript-sdk/tools/mcp-tools`
- `https://docs.inkeep.com/typescript-sdk/models`
- `https://docs.inkeep.com/talk-to-your-agents/chat-api`
- `https://github.com/inkeep/agents`
- `https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request`
- `https://openrouter.ai/openai/gpt-4.1-mini`
- `https://github.com/SciPhi-AI/R2R`
- `https://r2r-docs.sciphi.ai/api-and-sdks/retrieval/search-app`
- `https://github.com/huggingface/text-embeddings-inference`
- `refs/rag_pipeline.md`

## Requirements derived from the request

- Use Inkeep open source as the support agent layer.
- Build RAG over the current Mintlify docs.
- Use the authoritative production `llms.txt` at `https://streamloop.app/llms.txt` for customer support assistance.
- Use OpenRouter with `openai/gpt-4.1-mini` for answer generation.
- Keep credit usage low through short outputs, small retrieved context, and dry-run/local tests.
- Provide a production-ready setup, not only a sketch.
- Test the implementation.

## Architecture

```text
Mintlify docs
  + https://streamloop.app/llms.txt
  -> support-rag ingestion script
  -> R2R API
  -> Postgres + pgvector + full-text search
  -> Snowflake Arctic Embed L v2.0 embeddings
  -> GTE ModernBERT reranker
  -> support-rag HTTP/MCP service
  -> Inkeep sub-agent MCP tool
  -> OpenRouter GPT-4.1 mini final response
```

The implementation uses:

- Inkeep Agents SDK config for the support agent.
- A custom support docs tool exposed at `/mcp` and `/search`.
- R2R as the production RAG backend.
- Postgres/pgvector and Postgres full-text search through R2R.
- Snowflake Arctic Embed L v2.0 embeddings served by Hugging Face Text Embeddings Inference.
- `Alibaba-NLP/gte-reranker-modernbert-base` served by Hugging Face Text Embeddings Inference.
- OpenRouter chat completions for final answers with an allowlist that permits approved support answer model IDs.
- OpenTelemetry OTLP export for adapter traces.
- Dry-run answer mode for CI and local verification without model spend.
- The production `llms.txt` manifest is indexed as its own high-priority source because it includes support-critical brand, pricing, API, MCP, and when-to-use guidance.
- A local JSON/hash retriever remains only as a fallback for tests and development when R2R is unavailable.

## Production settings

Use the default production model:

```text
OPENROUTER_MODEL=openai/gpt-4.1-mini
```

OpenRouter's concrete model ID for the default support answer model is `openai/gpt-4.1-mini`. Inkeep's provider-prefixed form is `openrouter/openai/gpt-4.1-mini`. Avoid unpinned `latest` aliases in production so model changes are intentional.

Do not configure fallback models. Keep model changes explicit so support behavior remains testable.

Use these guardrails:

- `max_tokens` defaults to `700`.
- Retrieved context is capped to keep prompt cost bounded.
- Answers must cite retrieved docs by title and URL.
- If retrieval confidence is low, the assistant should say it does not know and suggest contacting support.

## Verification plan

- Install and typecheck the support workspace.
- Sync `llms.txt` from `https://streamloop.app/llms.txt`.
- Build the local fallback docs index.
- Validate Docker Compose and Tilt configuration.
- Run unit tests for ingestion, chunking, retrieval fallback, and approved support model enforcement.
- Run a no-credit dry-run answer test against the generated index.
- Start R2R stack with Docker/Tilt and run `npm run ingest:r2r` for production ingestion.
- Optionally run one live OpenRouter call with a very small token cap after the user confirms spend.
