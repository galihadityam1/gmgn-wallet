const { clamp, round, toNumber } = require("../utils/number");

function buildTradePlan(market, technical, config, confidence = null) {
  const price = toNumber(market.priceUsd, null);
  const marketCap = toNumber(market.marketCap, toNumber(market.fdv, null));
  if (!Number.isFinite(price) || price <= 0) {
    return {
      available: false,
      reason: "Price unavailable",
    };
  }
  if (!Number.isFinite(marketCap) || marketCap <= 0) {
    return {
      available: false,
      reason: "Market cap unavailable",
    };
  }

  const volatility = Math.abs(toNumber(market.priceChange?.h24, 0));
  const stopPct = volatility > 55 ? 0.1 : volatility < 18 ? 0.07 : 0.085;
  const entryLow = marketCap * 0.9925;
  const entryHigh = marketCap * 1.0125;
  const entry = marketCap;
  const stop = entry * (1 - stopPct);
  const risk = entry - stop;

  const oneR = entry + risk;
  const onePointFiveR = entry + risk * 1.5;
  const twoR = entry + risk * 2;
  const priceToMarketCap = marketCap / price;
  const resistanceMarketCap = technical.resistance
    ? technical.resistance * priceToMarketCap
    : null;
  const supportMarketCap = technical.support
    ? technical.support * priceToMarketCap
    : null;
  const levelTarget = resistanceMarketCap && resistanceMarketCap > onePointFiveR
    ? resistanceMarketCap
    : twoR;
  const finalTarget = Math.min(Math.max(twoR, levelTarget), entry * 1.35);
  const rewardRisk = (finalTarget - entry) / risk;

  return {
    available: true,
    basis: "market_cap",
    entry,
    entryLow,
    entryHigh,
    stop,
    stopPct,
    tp1: oneR,
    tp2: onePointFiveR,
    finalTarget,
    rewardRisk,
    referencePrice: price,
    referenceMarketCap: marketCap,
    supportMarketCap,
    resistanceMarketCap,
    invalidation: `Market cap breaks below ${round(stop, 2)} or loses intraday support`,
    sizeSol: suggestSize(config, stopPct, confidence),
  };
}

function suggestSize(config, stopPct, confidence) {
  if (!config) return null;

  const min = toNumber(config.minPositionSol, 0.05);
  const max = toNumber(config.maxPositionSol, 0.2);
  const maxRisk = toNumber(config.maxRiskPerTradeSol, null);
  const capital = toNumber(config.defaultCapitalSol, null);
  const confidenceFactor = confidence
    ? clamp(confidence / 100, 0.35, 1)
    : 0.5;

  if (Number.isFinite(maxRisk) && maxRisk > 0 && stopPct > 0) {
    return round(clamp((maxRisk / stopPct) * confidenceFactor, min, max), 3);
  }

  if (Number.isFinite(capital) && capital > 0) {
    return round(clamp(capital * 0.35 * confidenceFactor, min, max), 3);
  }

  return null;
}

module.exports = {
  buildTradePlan,
  suggestSize,
};
