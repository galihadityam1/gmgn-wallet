const { formatPrice, formatUsd } = require("./format");

function formatPlanValue(plan, value) {
  if (!plan?.available) return "-";
  return plan.basis === "market_cap" ? formatUsd(value) : formatPrice(value);
}

function planBasisLabel(plan) {
  return plan?.basis === "market_cap" ? "Market Cap" : "Price";
}

module.exports = {
  formatPlanValue,
  planBasisLabel,
};
