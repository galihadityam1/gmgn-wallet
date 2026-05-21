const { formatPlanValue } = require("../utils/trade-plan-format");

function buildRiskCriticMessages({ analysis, memory = [] }) {
  const context = buildAiContext({ analysis, memory });

  return [
    {
      role: "system",
      content: [
        "You are a local AI risk critic for a conservative intraday Solana token scanner.",
        "You explain why the deterministic rule engine assigned the current status, then review risks and missing data.",
        "You may downgrade or block ENTRY_READY, but you must never upgrade any token to ENTRY_READY.",
        "The reasoningSummary must start by explaining why the token is in its current ruleEngine.status.",
        "You do not execute trades.",
        "Return JSON only. Follow the provided schema exactly.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify(context),
    },
  ];
}

function buildAiContext({ analysis, memory = [] }) {
  const { market, safety, technical, plan, score } = analysis;

  return {
    task: "Explain why this signal received its current status, then review it as a risk critic. Look for reasons to be cautious or block.",
    guardrails: {
      canIncreaseConfidence: false,
      canUpgradeToEntryReady: false,
      canAutoTrade: false,
      outputMustBeJson: true,
    },
    token: {
      symbol: market.symbol,
      address: market.address,
    },
    ruleEngine: {
      status: analysis.status,
      filterResult: analysis.filterResult,
      score: score.total,
      scoreBreakdown: score.breakdown,
      reasons: analysis.reasons,
    },
    safety: {
      passed: safety.passed,
      result: safety.result,
      reasons: safety.reasons,
      flags: safety.flags,
    },
    market: {
      liquidityUsd: market.liquidityUsd,
      volume24h: market.volume24h,
      volume1h: market.volume1h,
      marketCap: market.marketCap,
      fdv: market.fdv,
      ageDays: market.ageDays,
      priceChange: market.priceChange,
      sources: market.sources,
    },
    technical: {
      setup: technical.setup,
      entryTrigger: technical.entryTrigger,
      overextended: technical.overextended,
      support: technical.support,
      resistance: technical.resistance,
      vwap: technical.vwap,
      indicators: technical.indicators,
      volumeConfirmation: technical.volumeConfirmation,
      warnings: technical.warnings,
    },
    tradePlan: plan.available
      ? {
          basis: plan.basis,
          entry: plan.entry,
          entryText: formatPlanValue(plan, plan.entry),
          stop: plan.stop,
          stopText: formatPlanValue(plan, plan.stop),
          tp1: plan.tp1,
          tp2: plan.tp2,
          finalTarget: plan.finalTarget,
          finalTargetText: formatPlanValue(plan, plan.finalTarget),
          rewardRisk: plan.rewardRisk,
          invalidation: plan.invalidation,
        }
      : { available: false, reason: plan.reason },
    memory,
  };
}

module.exports = {
  buildAiContext,
  buildRiskCriticMessages,
};
