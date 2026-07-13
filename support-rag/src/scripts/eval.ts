import { config } from "../config.js";
import { createEmbeddingProvider } from "../rag/embeddings.js";
import { loadIndex } from "../rag/index-store.js";
import { answerSupportQuestion } from "../rag/answer.js";
import { searchIndex } from "../rag/search.js";

const questions = [
  "How do I stream a prerecorded video to YouTube?",
  "What file formats can I upload?",
  "How does billing work?"
];

const index = await loadIndex(config.indexPath);
const embeddingProvider = createEmbeddingProvider();

for (const question of questions) {
  const results = await searchIndex(index, embeddingProvider, question, 4);
  const answer = await answerSupportQuestion(question, results);
  console.log(JSON.stringify({ question, top: results[0]?.title, dryRun: answer.dryRun, citations: answer.citations }, null, 2));
}
