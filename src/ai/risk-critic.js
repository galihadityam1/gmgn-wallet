const { buildRiskCriticMessages } = require("./prompt");

class AiRiskCritic {
  constructor({ config, client, storage }) {
    this.config = config;
    this.client = client;
    this.storage = storage;
  }

  isEnabled() {
    return Boolean(this.config.ai.enabled && this.client);
  }

  async reviewAnalysis(analysis, { mode = "automatic", force = false } = {}) {
    if (!this.isEnabled()) {
      return unavailableReview("AI_DISABLED");
    }

    if (mode === "automatic" && analysis.status !== "ENTRY_READY") {
      return null;
    }

    if (!force) {
      const cached = await this.storage.getAiReview?.(analysis);
      if (cached) return cached;
    }

    try {
      const memory = await this.storage.getAiMemory?.(analysis, { limit: 5 });
      const messages = buildRiskCriticMessages({ analysis, memory: memory || [] });
      const rawReview = await this.client.review(messages);
      const guarded = applyAiGuardrails(analysis, rawReview);
      await this.storage.saveAiReview?.(analysis, guarded, { mode });
      return guarded;
    } catch (err) {
      return unavailableReview("AI_UNAVAILABLE", err.message);
    }
  }
}

function applyAiGuardrails(analysis, review) {
  const confidenceAdjustment = Math.min(0, Number(review.confidenceAdjustment || 0));
  const finalStatus = deriveFinalStatus(analysis.status, review.verdict);

  return {
    ...review,
    confidenceAdjustment,
    originalStatus: analysis.status,
    finalStatus,
    blocked: review.verdict === "BLOCK" && analysis.status === "ENTRY_READY",
    unavailable: false,
    reviewedAt: new Date().toISOString(),
  };
}

function deriveFinalStatus(originalStatus, verdict) {
  if (originalStatus !== "ENTRY_READY") return originalStatus;
  if (verdict === "BLOCK") return "SETUP";
  return "ENTRY_READY";
}

function unavailableReview(code, message = "") {
  return {
    verdict: "CAUTION",
    confidenceAdjustment: 0,
    riskNotes: [code],
    missingData: [],
    reasoningSummary: message || code,
    suggestedAction: "Continue with rule-engine result; AI review unavailable.",
    originalStatus: null,
    finalStatus: null,
    blocked: false,
    unavailable: true,
    reviewedAt: new Date().toISOString(),
  };
}

function applyAiReviewToAnalysis(analysis, review) {
  if (!review || review.unavailable) {
    return analysis;
  }

  const adjustedScore = Math.max(
    0,
    Math.min(100, analysis.score.total + review.confidenceAdjustment),
  );

  return {
    ...analysis,
    aiReview: review,
    status: review.finalStatus || analysis.status,
    score: {
      ...analysis.score,
      total: adjustedScore,
      originalTotal: analysis.score.total,
    },
    reasons: [
      review.verdict === "BLOCK"
        ? `AI blocked entry: ${review.reasoningSummary}`
        : `AI ${review.verdict.toLowerCase()}: ${review.reasoningSummary}`,
      ...analysis.reasons,
    ].slice(0, 9),
    shortReason:
      review.verdict === "BLOCK"
        ? `AI blocked: ${review.riskNotes[0] || review.reasoningSummary}`
        : analysis.shortReason,
  };
}

module.exports = {
  AiRiskCritic,
  applyAiGuardrails,
  applyAiReviewToAnalysis,
  deriveFinalStatus,
  unavailableReview,
};
