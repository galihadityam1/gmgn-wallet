const test = require("node:test");
const assert = require("node:assert/strict");

const { validateAiReview } = require("../src/ai/schema");
const {
  applyAiGuardrails,
  applyAiReviewToAnalysis,
  deriveFinalStatus,
} = require("../src/ai/risk-critic");

function analysis(status = "ENTRY_READY") {
  return {
    status,
    filterResult: "PASS",
    score: { total: 88, breakdown: {} },
    reasons: ["Rule engine entry-ready"],
    shortReason: "Rule engine entry-ready",
    market: {
      symbol: "TEST",
      address: "So11111111111111111111111111111111111111112",
    },
  };
}

test("AI review schema accepts valid risk critic output", () => {
  const review = validateAiReview({
    verdict: "CAUTION",
    confidenceAdjustment: -10,
    riskNotes: ["Volume confirmation is mixed"],
    missingData: ["Holder concentration"],
    reasoningSummary: "Setup is valid but risk is elevated.",
    suggestedAction: "Wait for retest.",
  });

  assert.equal(review.verdict, "CAUTION");
});

test("AI review schema rejects confidence increases", () => {
  assert.throws(() =>
    validateAiReview({
      verdict: "PASS",
      confidenceAdjustment: 5,
      riskNotes: [],
      missingData: [],
      reasoningSummary: "Looks fine.",
      suggestedAction: "Proceed manually.",
    }),
  );
});

test("AI cannot upgrade non-entry statuses to entry-ready", () => {
  assert.equal(deriveFinalStatus("WATCH", "PASS"), "WATCH");
  assert.equal(deriveFinalStatus("SETUP", "PASS"), "SETUP");
  assert.equal(deriveFinalStatus("AVOID", "PASS"), "AVOID");
});

test("AI block downgrades entry-ready to setup", () => {
  const guarded = applyAiGuardrails(analysis("ENTRY_READY"), {
    verdict: "BLOCK",
    confidenceAdjustment: -25,
    riskNotes: ["Possible distribution near resistance"],
    missingData: [],
    reasoningSummary: "Risk is too high.",
    suggestedAction: "Do not enter yet.",
  });

  assert.equal(guarded.finalStatus, "SETUP");
  assert.equal(guarded.blocked, true);
});

test("AI caution lowers score but keeps entry-ready", () => {
  const guarded = applyAiGuardrails(analysis("ENTRY_READY"), {
    verdict: "CAUTION",
    confidenceAdjustment: -12,
    riskNotes: ["Retest not clean"],
    missingData: [],
    reasoningSummary: "Still valid but less clean.",
    suggestedAction: "Reduce size.",
  });
  const next = applyAiReviewToAnalysis(analysis("ENTRY_READY"), guarded);

  assert.equal(next.status, "ENTRY_READY");
  assert.equal(next.score.total, 76);
  assert.equal(next.score.originalTotal, 88);
});
