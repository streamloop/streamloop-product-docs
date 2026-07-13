import { assertSupportModel, config } from "../config.js";
import type { SearchResult } from "./search.js";

export type AnswerResult = {
  answer: string;
  model: string;
  dryRun: boolean;
  citations: Array<{ title: string; url: string; headingPath: string[]; score: number }>;
};

export async function answerSupportQuestion(question: string, results: SearchResult[]): Promise<AnswerResult> {
  assertSupportModel(config.openRouterModel);
  const citations = results.map((result) => ({
    title: result.title,
    url: result.url,
    headingPath: result.headingPath,
    score: result.score
  }));

  if (config.dryRun) {
    return {
      answer: dryRunAnswer(question, results),
      model: config.openRouterModel,
      dryRun: true,
      citations
    };
  }

  if (!config.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is required when DRY_RUN is not true.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.openRouterSiteUrl,
      "X-Title": config.openRouterAppName
    },
    body: JSON.stringify({
      model: config.openRouterModel,
      max_tokens: config.openRouterMaxTokens,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are Streamloop customer support. Answer only from the provided documentation context. Be concise, use second person, and cite source titles with URLs. If the context is insufficient, say so and recommend contacting support."
        },
        {
          role: "user",
          content: buildPrompt(question, results)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("OpenRouter response did not include assistant content.");
  }

  return {
    answer,
    model: config.openRouterModel,
    dryRun: false,
    citations
  };
}

function buildPrompt(question: string, results: SearchResult[]): string {
  const context = results
    .map((result, index) => {
      const path = result.headingPath.join(" > ");
      return `[${index + 1}] ${result.title}\nURL: ${result.url}\nHeading: ${path}\n${result.content}`;
    })
    .join("\n\n");

  return `Question: ${question}\n\nDocumentation context:\n${context}`;
}

function dryRunAnswer(question: string, results: SearchResult[]): string {
  if (results.length === 0 || results[0].score < 0.05) {
    return `I could not find enough Streamloop documentation to answer "${question}". Contact Streamloop support with the exact error, destination, and stream ID.`;
  }

  const top = results[0];
  return `Dry-run answer: the best matching documentation is "${top.title}" at ${top.url}. Review ${top.headingPath.join(" > ")} for the support answer.`;
}
