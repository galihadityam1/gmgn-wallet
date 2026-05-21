const { z } = require("zod");

const AiReviewSchema = z.object({
  verdict: z.enum(["PASS", "CAUTION", "BLOCK"]),
  confidenceAdjustment: z.number().max(0).min(-50),
  riskNotes: z.array(z.string()).max(6).default([]),
  missingData: z.array(z.string()).max(6).default([]),
  reasoningSummary: z.string().min(1).max(1200),
  suggestedAction: z.string().min(1).max(500),
});

function aiReviewJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "verdict",
      "confidenceAdjustment",
      "riskNotes",
      "missingData",
      "reasoningSummary",
      "suggestedAction",
    ],
    properties: {
      verdict: {
        type: "string",
        enum: ["PASS", "CAUTION", "BLOCK"],
      },
      confidenceAdjustment: {
        type: "number",
        minimum: -50,
        maximum: 0,
      },
      riskNotes: {
        type: "array",
        maxItems: 6,
        items: {
          type: "string",
        },
      },
      missingData: {
        type: "array",
        maxItems: 6,
        items: {
          type: "string",
        },
      },
      reasoningSummary: {
        type: "string",
        minLength: 1,
        maxLength: 1200,
      },
      suggestedAction: {
        type: "string",
        minLength: 1,
        maxLength: 500,
      },
    },
  };
}

function validateAiReview(value) {
  return AiReviewSchema.parse(value);
}

module.exports = {
  AiReviewSchema,
  aiReviewJsonSchema,
  validateAiReview,
};
