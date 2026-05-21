const { colors, pad, shortAddress, truncate } = require("../utils/format");
const { formatPlanValue } = require("../utils/trade-plan-format");

function renderHistory(rows, storage) {
  if (!storage.enabled) {
    console.log(colors.yellow(`History unavailable: ${storage.reason}`));
    return;
  }

  if (!rows.length) {
    console.log("No signal history found yet.");
    return;
  }

  console.log(colors.cyan("Signal History"));
  console.log(
    [
      pad("TIME", 20, "left"),
      pad("SYM", 10, "left"),
      pad("TOKEN", 10, "left"),
      pad("STATUS", 15, "left"),
      pad("FILTER", 9, "left"),
      pad("SCORE", 6),
      pad("ENTRY", 12),
      "REASON",
    ].join(" "),
  );
  console.log("-".repeat(105));

  for (const row of rows) {
    const plan = row.trade_plan || {};
    const reasons = Array.isArray(row.reasons) ? row.reasons : [];
    console.log(
      [
        pad(new Date(row.created_at).toLocaleString(), 20, "left"),
        pad(truncate(row.symbol || "UNKNOWN", 10), 10, "left"),
        pad(shortAddress(row.token_address), 10, "left"),
        pad(row.status, 15, "left"),
        pad(row.filter_result, 9, "left"),
        pad(row.score, 6),
        pad(plan.entry ? formatPlanValue(plan, Number(plan.entry)) : "-", 12),
        truncate(reasons[0] || "-", 38),
      ].join(" "),
    );
  }
}

module.exports = {
  renderHistory,
};
