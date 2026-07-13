const supportModel = "openrouter/openai/gpt-4.1-mini";

export default {
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
  }
};
