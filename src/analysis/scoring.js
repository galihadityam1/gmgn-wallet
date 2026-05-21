const { clamp, toNumber } = require("../utils/number");

function scoreToken({ market, safety, technical, plan }) {
  const breakdown = {
    dataQuality: scoreDataQuality(market),
    safetyLiquidity: scoreSafetyLiquidity(market, safety),
    intradayStructure: clamp(technical.structureScore || 0, 0, 30),
    volumeConfirmation: scoreVolume(technical),
    riskReward: scoreRiskReward(plan),
  };

  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return {
    total: Math.round(clamp(total, 0, 100)),
    breakdown,
  };
}

function scoreDataQuality(market) {
  const checks = [
    Number.isFinite(toNumber(market.priceUsd, null)),
    Number.isFinite(toNumber(market.liquidityUsd, null)),
    Number.isFinite(toNumber(market.volume24h, null)),
    Number.isFinite(toNumber(market.ageDays, null)),
    Boolean(market.pairAddress || market.marketCap || market.fdv),
  ];
  return checks.filter(Boolean).length * 3;
}

function scoreSafetyLiquidity(market, safety) {
  if (safety.riskFlag) return 0;

  const liquidity = toNumber(market.liquidityUsd, 0);
  const volume = toNumber(market.volume24h, 0);
  const filters = safety.filters;
  let score = safety.passed ? 12 : 0;

  if (liquidity >= filters.minLiquidityUsd) score += 5;
  if (liquidity >= filters.minLiquidityUsd * 2) score += 3;
  if (volume >= filters.minVolume24hUsd) score += 3;
  if (volume >= filters.minVolume24hUsd * 2) score += 2;

  return clamp(score, 0, 25);
}

function scoreVolume(technical) {
  const confirmation = technical.volumeConfirmation;
  if (!confirmation?.confirmed) return 3;

  let score = 10;
  if (confirmation.buySellRatio && confirmation.buySellRatio >= 1.25) score += 3;
  if (confirmation.h1VolumeShare && confirmation.h1VolumeShare >= 0.05) score += 2;
  return clamp(score, 0, 15);
}

function scoreRiskReward(plan) {
  if (!plan.available || !Number.isFinite(plan.rewardRisk)) return 0;
  if (plan.rewardRisk >= 2) return 15;
  if (plan.rewardRisk >= 1.5) return 12;
  if (plan.rewardRisk >= 1.2) return 8;
  return 3;
}

module.exports = {
  scoreToken,
};
