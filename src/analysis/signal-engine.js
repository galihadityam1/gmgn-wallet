const { evaluateSafety } = require("./safety-gate");
const { analyzeTechnical } = require("./technical");
const { buildTradePlan } = require("./trade-plan");
const { scoreToken } = require("./scoring");

function analyzeToken(market, config) {
  const safety = evaluateSafety(market, config.filterMode);
  const technical = analyzeTechnical(market);
  const initialPlan = buildTradePlan(market, technical, config);
  const score = scoreToken({ market, safety, technical, plan: initialPlan });
  const plan = buildTradePlan(market, technical, config, score.total);
  const status = determineStatus({ safety, technical, plan, score });
  const reasons = buildReasons({ safety, technical, plan, score, status });

  return {
    market,
    safety,
    technical,
    plan,
    score,
    status,
    filterResult: safety.result,
    reasons,
    shortReason: reasons[0] || "No reason available",
    analyzedAt: new Date().toISOString(),
  };
}

function determineStatus({ safety, technical, plan, score }) {
  if (safety.riskFlag) return "AVOID";
  if (safety.lowData) return "WATCH_LOW_DATA";
  if (safety.result === "LOW_AGE") {
    return score.total >= 45 ? "WATCH" : "WATCH_LOW_DATA";
  }
  if (!safety.passed) return "AVOID";
  if (!plan.available || plan.rewardRisk < 1.2) return "AVOID";
  if (score.total >= 80 && technical.entryTrigger && plan.rewardRisk >= 1.5) {
    return "ENTRY_READY";
  }
  if (score.total >= 65 && technical.setup) return "SETUP";
  if (score.total >= 45) return "WATCH";
  return "AVOID";
}

function buildReasons({ safety, technical, plan, score, status }) {
  const reasons = [];

  if (status === "ENTRY_READY") {
    reasons.push(`Entry-ready: score ${score.total}, RR ${plan.rewardRisk.toFixed(2)}R`);
  } else if (status === "SETUP") {
    reasons.push(`Setup forming: score ${score.total}, waiting for trigger`);
  } else if (status === "WATCH") {
    if (safety.result === "LOW_AGE") {
      reasons.push(`Young token watch-only: score ${score.total}, maturity filter not met`);
    } else {
      reasons.push(`Healthy enough to watch: score ${score.total}`);
    }
  } else if (status === "WATCH_LOW_DATA") {
    reasons.push("Not enough data for reliable intraday signal");
  } else {
    reasons.push(safety.reasons[0] || "Setup does not meet conservative rules");
  }

  reasons.push(...safety.reasons.slice(0, 3));
  reasons.push(...technical.reasons.slice(0, 3));
  reasons.push(...technical.volumeConfirmation.reasons.slice(0, 1));
  reasons.push(...technical.warnings.slice(0, 2));

  return [...new Set(reasons)].slice(0, 8);
}

module.exports = {
  analyzeToken,
  determineStatus,
};
