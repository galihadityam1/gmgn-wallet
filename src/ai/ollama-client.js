const { Ollama } = require("ollama");
const { aiReviewJsonSchema, validateAiReview } = require("./schema");

class OllamaAiClient {
  constructor(config, options = {}) {
    this.config = config;
    this.client =
      options.client ||
      new Ollama({
        host: config.ai.ollamaBaseUrl,
      });
  }

  async review(messages) {
    const response = await withTimeout(
      this.client.chat({
        model: this.config.ai.model,
        messages,
        format: aiReviewJsonSchema(),
        options: {
          temperature: 0.1,
        },
      }),
      this.config.ai.timeoutMs,
    );

    const content = response?.message?.content;
    if (!content) {
      throw new Error("Ollama returned empty content");
    }

    return validateAiReview(JSON.parse(content));
  }
}

function withTimeout(promise, timeoutMs) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("AI request timed out")), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

module.exports = {
  OllamaAiClient,
  withTimeout,
};
