const {
  colors,
  formatPrice,
  formatSol,
  formatUsd,
  shortAddress,
} = require("../utils/format");
const { percent } = require("../utils/number");
const { formatPlanValue, planBasisLabel } = require("../utils/trade-plan-format");

function renderDetail(analysis, storage) {
  const { market, safety, technical, plan, score } = analysis;

  console.log(colors.cyan(`${market.symbol || "UNKNOWN"} ${shortAddress(market.address)}`));
  console.log(`Address: ${market.address}`);
  console.log(`Status: ${statusColor(analysis.status)} | Filter: ${analysis.filterResult} | Score: ${score.total}/100`);
  if (score.originalTotal !== undefined) {
    console.log(`Rule score before AI: ${score.originalTotal}/100`);
  }
  console.log("");

  console.log(colors.bold("Market"));
  console.log(`Price: ${formatPrice(market.priceUsd)}`);
  console.log(`Liquidity: ${formatUsd(market.liquidityUsd)}`);
  console.log(`24h Volume: ${formatUsd(market.volume24h)}`);
  console.log(`Market Cap/FDV: ${formatUsd(market.marketCap || market.fdv)}`);
  console.log(`Age: ${Number.isFinite(market.ageDays) ? `${market.ageDays.toFixed(1)}d` : "-"}`);
  console.log(`Sources: ${Object.values(market.sources || {}).join(", ") || "-"}`);
  if (market.url) console.log(`Dex: ${market.url}`);
  console.log("");

  console.log(colors.bold("Safety Gate"));
  console.log(`Result: ${safety.result}`);
  console.log(`Passed: ${safety.passed ? "yes" : "no"}`);
  for (const reason of safety.reasons) console.log(`- ${reason}`);
  if (!safety.reasons.length) console.log("- No safety blockers found");
  console.log("");

  console.log(colors.bold("Score Breakdown"));
  for (const [key, value] of Object.entries(score.breakdown)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("");

  console.log(colors.bold("Technical"));
  console.log(`Setup: ${technical.setup ? "yes" : "no"} | Trigger: ${technical.entryTrigger ? "yes" : "no"}`);
  console.log(`VWAP estimate: ${formatPrice(technical.vwap)}`);
  console.log(`Support: ${formatPrice(technical.support)} | Resistance: ${formatPrice(technical.resistance)}`);
  console.log(`EMA 9/21: ${formatPrice(technical.indicators?.ema?.ema9)} / ${formatPrice(technical.indicators?.ema?.ema21)}`);
  console.log(`MA 20/50: ${formatPrice(technical.indicators?.ma?.ma20)} / ${formatPrice(technical.indicators?.ma?.ma50)}`);
  console.log(
    `Bollinger 20/2: ${formatPrice(technical.indicators?.bollinger?.lower)} / ${formatPrice(
      technical.indicators?.bollinger?.middle,
    )} / ${formatPrice(technical.indicators?.bollinger?.upper)} (${technical.indicators?.bollinger?.position || "-"})`,
  );
  console.log(
    `Parabolic SAR: ${formatPrice(technical.indicators?.sar?.value)} (${technical.indicators?.sar?.trend || "-"})`,
  );
  for (const reason of technical.reasons) console.log(`- ${reason}`);
  for (const warning of technical.warnings) console.log(`- Warning: ${warning}`);
  console.log("");

  console.log(colors.bold("Trade Plan"));
  if (!plan.available) {
    console.log(plan.reason);
  } else {
    console.log(`Basis: ${planBasisLabel(plan)}`);
    console.log(`Reference price: ${formatPrice(plan.referencePrice)}`);
    console.log(`Entry area: ${formatPlanValue(plan, plan.entryLow)} - ${formatPlanValue(plan, plan.entryHigh)}`);
    console.log(`Stop: ${formatPlanValue(plan, plan.stop)} (${percent(-plan.stopPct * 100)})`);
    console.log(`TP1: ${formatPlanValue(plan, plan.tp1)}`);
    console.log(`TP2: ${formatPlanValue(plan, plan.tp2)}`);
    console.log(`Final: ${formatPlanValue(plan, plan.finalTarget)} (${plan.rewardRisk.toFixed(2)}R)`);
    console.log(`Invalidation: ${plan.invalidation}`);
    console.log(`Suggested size: ${plan.sizeSol ? formatSol(plan.sizeSol) : "optional, configure capital/risk first"}`);
  }
  console.log("");

  console.log(colors.bold("Reasons"));
  for (const reason of analysis.reasons) console.log(`- ${reason}`);

  if (analysis.aiReview) {
    console.log("");
    console.log(colors.bold("AI Risk Critic"));
    console.log(`Verdict: ${analysis.aiReview.verdict}`);
    console.log(`Confidence adjustment: ${analysis.aiReview.confidenceAdjustment}`);
    console.log(`Final status: ${analysis.aiReview.finalStatus || analysis.status}`);
    console.log(`Summary: ${analysis.aiReview.reasoningSummary}`);
    console.log(`Suggested action: ${analysis.aiReview.suggestedAction}`);
    for (const note of analysis.aiReview.riskNotes || []) console.log(`- Risk: ${note}`);
    for (const item of analysis.aiReview.missingData || []) console.log(`- Missing: ${item}`);
  }

  if (!storage.enabled) {
    console.log("");
    console.log(colors.yellow(`History disabled: ${storage.reason}`));
  }
}

function statusColor(status) {
  if (status === "ENTRY_READY") return colors.green(status);
  if (status === "SETUP") return colors.yellow(status);
  if (status === "AVOID") return colors.red(status);
  return status;
}

module.exports = {
  renderDetail,
};
