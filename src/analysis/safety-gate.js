const { FILTER_MODES } = require("../config");
const { toNumber } = require("../utils/number");

const RISK_KEYWORDS = [
  "honeypot",
  "blacklist",
  "cannot_sell",
  "cant_sell",
  "freeze",
  "mint_authority",
  "mutable",
  "rug",
  "scam",
  "wash_trading",
  "creator_remove_liquidity",
];

const SAFE_KEYWORDS = [
  "renounced",
  "burn",
  "burnt",
  "verified",
  "locked",
];

function evaluateSafety(market, mode = "conservative") {
  const filters = FILTER_MODES[mode] || FILTER_MODES.conservative;
  const reasons = [];
  const flags = collectRiskFlags(market.security);

  const ageDays = toNumber(market.ageDays, null);
  const liquidityUsd = toNumber(market.liquidityUsd, null);
  const volume24h = toNumber(market.volume24h, null);

  if (flags.length > 0) {
    reasons.push(`Risk flags: ${flags.slice(0, 3).join(", ")}`);
  }

  if (!Number.isFinite(ageDays)) reasons.push("Token age unavailable");
  else if (ageDays < filters.minAgeDays) {
    reasons.push(`Age ${ageDays.toFixed(1)}d < ${filters.minAgeDays}d`);
  }

  if (!Number.isFinite(liquidityUsd)) reasons.push("Liquidity unavailable");
  else if (liquidityUsd < filters.minLiquidityUsd) {
    reasons.push(`Liquidity below $${filters.minLiquidityUsd.toLocaleString()}`);
  }

  if (!Number.isFinite(volume24h)) reasons.push("24h volume unavailable");
  else if (volume24h < filters.minVolume24hUsd) {
    reasons.push(`24h volume below $${filters.minVolume24hUsd.toLocaleString()}`);
  }

  const lowData =
    !Number.isFinite(ageDays) || !Number.isFinite(liquidityUsd) || !Number.isFinite(volume24h);
  const failedThreshold =
    Number.isFinite(ageDays) && ageDays < filters.minAgeDays
      ? true
      : Number.isFinite(liquidityUsd) && liquidityUsd < filters.minLiquidityUsd
        ? true
        : Number.isFinite(volume24h) && volume24h < filters.minVolume24hUsd;
  const riskFlag = flags.length > 0;

  return {
    passed: !lowData && !failedThreshold && !riskFlag,
    lowData,
    riskFlag,
    result: riskFlag
      ? "RISK_FLAG"
      : lowData
        ? "LOW_DATA"
        : failedThreshold
          ? firstThresholdCode({ ageDays, liquidityUsd, volume24h, filters })
          : "PASS",
    reasons,
    flags,
    filters,
  };
}

function firstThresholdCode({ ageDays, liquidityUsd, volume24h, filters }) {
  if (Number.isFinite(ageDays) && ageDays < filters.minAgeDays) return "LOW_AGE";
  if (Number.isFinite(liquidityUsd) && liquidityUsd < filters.minLiquidityUsd) return "LOW_LIQ";
  if (Number.isFinite(volume24h) && volume24h < filters.minVolume24hUsd) return "LOW_VOL";
  return "BLOCKED";
}

function collectRiskFlags(security) {
  if (!security || typeof security !== "object") return [];
  const flags = [];

  walkSecurity(security, "", (key, value) => {
    const normalized = key.toLowerCase();
    const safeName = SAFE_KEYWORDS.some((keyword) => normalized.includes(keyword));
    if (safeName) return;

    const riskyName = RISK_KEYWORDS.some((keyword) => normalized.includes(keyword));
    if (!riskyName) return;

    if (value === true || value === "true" || value === 1 || value === "1") {
      flags.push(key);
    }

    if (normalized.includes("risk") && typeof value === "string" && value.toLowerCase() !== "none") {
      flags.push(`${key}:${value}`);
    }
  });

  return [...new Set(flags)].slice(0, 10);
}

function walkSecurity(value, prefix, visitor) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      walkSecurity(child, fullKey, visitor);
    } else {
      visitor(fullKey, child);
    }
  }
}

module.exports = {
  collectRiskFlags,
  evaluateSafety,
};
