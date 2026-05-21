const {
  colors,
  formatPrice,
  formatSol,
  formatUsd,
  pad,
  shortAddress,
  truncate,
} = require("../utils/format");
const { percent } = require("../utils/number");
const { formatPlanValue } = require("../utils/trade-plan-format");

function renderDashboard({ analyses, config, errors = [], storage }) {
  console.clear();
  console.log(colors.cyan("GMGN Conservative Intraday Scanner"));
  console.log(
    colors.dim(
      `chain=sol mode=${config.filterMode} limit=${config.scanLimit} source=GMGN+fallback updated=${new Date().toLocaleTimeString()}`,
    ),
  );

  if (!storage.enabled) {
    console.log(colors.yellow(`history disabled: ${storage.reason}`));
  }

  if (errors.length) {
    for (const error of errors.slice(0, 3)) {
      console.log(colors.yellow(`warning: ${error}`));
    }
  }

  console.log("");
  console.log(
    [
      pad("#", 3),
      pad("SYM", 10, "left"),
      pad("TOKEN", 10, "left"),
      pad("STATUS", 15, "left"),
      pad("FILTER", 9, "left"),
      pad("SCORE", 6),
      pad("LIQ", 10),
      pad("VOL24", 10),
      pad("MCAP", 10),
      pad("ENTRY MC", 12),
      pad("STOP MC", 12),
      pad("TP MC", 12),
      pad("AI", 8, "left"),
      "REASON",
    ].join(" "),
  );
  console.log("-".repeat(145));

  if (!analyses.length) {
    console.log("No candidates available. Add watchlist tokens or check GMGN connectivity.");
    return;
  }

  analyses.forEach((analysis, index) => {
    const market = analysis.market;
    const plan = analysis.plan;
    console.log(
      [
        pad(index + 1, 3),
        pad(truncate(market.symbol || "UNKNOWN", 10), 10, "left"),
        pad(shortAddress(market.address), 10, "left"),
        pad(colorStatus(analysis.status), 15, "left"),
        pad(analysis.filterResult, 9, "left"),
        pad(analysis.score.total, 6),
        pad(formatUsd(market.liquidityUsd), 10),
        pad(formatUsd(market.volume24h), 10),
        pad(formatUsd(market.marketCap || market.fdv), 10),
        pad(plan.available ? formatPlanValue(plan, plan.entry) : "-", 12),
        pad(plan.available ? formatPlanValue(plan, plan.stop) : "-", 12),
        pad(plan.available ? formatPlanValue(plan, plan.finalTarget) : "-", 12),
        pad(analysis.aiReview?.verdict || "-", 8, "left"),
        truncate(analysis.shortReason, 42),
      ].join(" "),
    );
  });

  console.log("-".repeat(145));
  console.log(
    colors.dim(
      `Refresh: ${config.refreshSeconds}s | Detail: node bin/gmgn-scanner.js detail <token> | Stop: Ctrl+C`,
    ),
  );
}

function renderAlerts(alerts) {
  for (const analysis of alerts) {
    const plan = analysis.plan;
    console.log("");
    console.log(colors.green(`ENTRY_READY ${analysis.market.symbol} ${shortAddress(analysis.market.address)}`));
    console.log(
      `Score ${analysis.score.total} | Entry MC ${formatPlanValue(plan, plan.entry)} | Stop MC ${formatPlanValue(
        plan,
        plan.stop,
      )} (${percent(-plan.stopPct * 100)}) | Final MC ${formatPlanValue(plan, plan.finalTarget)} | RR ${plan.rewardRisk.toFixed(2)}R`,
    );
    if (plan.sizeSol) console.log(`Suggested size: ${formatSol(plan.sizeSol)}`);
    console.log(analysis.reasons.slice(0, 4).join(" | "));
  }
}

function colorStatus(status) {
  if (status === "ENTRY_READY") return colors.green(status);
  if (status === "SETUP") return colors.yellow(status);
  if (status === "AVOID") return colors.red(status);
  return status;
}

module.exports = {
  renderAlerts,
  renderDashboard,
};
