import { agent, mcpTool, project, subAgent } from "@inkeep/agents-sdk";

const supportModel = "openrouter/openai/gpt-4.1-mini";

const docsSearchTool = mcpTool({
  id: "streamloop-support-docs-rag",
  name: "streamloop_support_docs",
  description: "Search Streamloop documentation for support answers with citations.",
  serverUrl: process.env.SUPPORT_RAG_MCP_URL ?? "http://localhost:8787/mcp",
  prompt: `Use this tool before answering product, billing, streaming, platform, API, or troubleshooting questions.
Only answer from retrieved documentation.
When the documentation is insufficient, say what is missing and suggest contacting Streamloop support.
Always include citations with page titles and URLs.`
});

const supportSubAgent = subAgent({
  id: "streamloop-customer-support",
  name: "Streamloop customer support",
  description: "Answers Streamloop customer support questions from the docs.",
  stopWhen: {
    stepCountIs: 6
  },
  canUse: () => [docsSearchTool],
  prompt: `You are a concise Streamloop customer support agent.
Use active voice and second person.
Search the docs before giving product-specific answers.
Do not invent account state, billing status, stream status, refunds, or internal policy.
For urgent live-streaming failures, give the safest documented next step and recommend contacting support when docs do not resolve the issue.
Prefer short answers with clear steps.`
});

export const streamloopSupportAgent = agent({
  id: "streamloop-support-agent",
  name: "Streamloop support agent",
  description: "Customer support assistant grounded in Streamloop documentation.",
  defaultSubAgent: supportSubAgent,
  stopWhen: {
    transferCountIs: 2
  },
  subAgents: () => [supportSubAgent],
  prompt: `You support Streamloop, a cloud service for streaming pre-recorded video to YouTube and RTMP destinations.
Use only approved Streamloop support models.
Answer only with retrieved documentation or safe escalation guidance.`
});

export const streamloopSupportProject = project({
  id: "streamloop-support-project",
  name: "Streamloop support",
  description: "Customer support assistant grounded in Streamloop documentation.",
  models: {
    base: {
      model: supportModel,
      providerOptions: {
        temperature: 0.2,
        maxOutputTokens: 700,
        maxDuration: 20
      }
    },
    structuredOutput: {
      model: supportModel,
      providerOptions: {
        temperature: 0,
        maxOutputTokens: 500,
        maxDuration: 20
      }
    },
    summarizer: {
      model: supportModel,
      providerOptions: {
        temperature: 0.2,
        maxOutputTokens: 300,
        maxDuration: 20
      }
    }
  },
  agents: () => [streamloopSupportAgent]
});

export default streamloopSupportProject;
