const { toNumber } = require("../utils/number");

function analyzeTechnical(market) {
  const price = toNumber(market.priceUsd, null);
  const kline = Array.isArray(market.kline) ? market.kline : [];
  const stats = klineStats(kline);
  const indicators = computeIndicators(kline);
  const change = market.priceChange || {};

  const h1 = toNumber(change.h1, null);
  const h6 = toNumber(change.h6, null);
  const h24 = toNumber(change.h24, null);
  const m5 = toNumber(change.m5, null);

  const reasons = [];
  const warnings = [];
  let structureScore = 0;

  if (Number.isFinite(h1) && h1 > 0.5) {
    structureScore += 6;
    reasons.push(`1h strength ${h1.toFixed(1)}%`);
  }
  if (Number.isFinite(h6) && h6 > -5) structureScore += 5;
  if (Number.isFinite(h24) && h24 > -20 && h24 < 120) structureScore += 5;
  if (Number.isFinite(m5) && m5 > -5) structureScore += 3;

  if (stats.hasEnoughCandles) {
    if (price && stats.vwap && price >= stats.vwap) {
      structureScore += 5;
      reasons.push("Price above 24h VWAP estimate");
    }
    if (stats.higherLow) {
      structureScore += 4;
      reasons.push("Recent candles show higher-low structure");
    }
    if (stats.lastCloseNearHigh) structureScore += 2;
  }

  if (indicators.hasEmaSignal) {
    structureScore += 4;
    reasons.push("EMA 9 above EMA 21 with price holding trend");
  }

  if (indicators.hasMaSignal) {
    structureScore += 3;
    reasons.push("MA 20 above MA 50 with price above MA 20");
  }

  if (indicators.bollinger?.position === "upper_half") {
    structureScore += 2;
    reasons.push("Price trading in upper Bollinger range");
  } else if (indicators.bollinger?.position === "above_upper") {
    structureScore += 1;
    warnings.push("Price is above upper Bollinger band; avoid chasing without retest");
  } else if (indicators.bollinger?.position === "below_lower") {
    warnings.push("Price is below lower Bollinger band; momentum is weak");
  }

  if (indicators.sar?.trend === "bullish") {
    structureScore += 4;
    reasons.push("Parabolic SAR supports bullish continuation");
  } else if (indicators.sar?.trend === "bearish") {
    warnings.push("Parabolic SAR is still bearish");
  }

  const overextended =
    (Number.isFinite(h1) && h1 > 25) || (Number.isFinite(h24) && h24 > 150);
  if (overextended) warnings.push("Move may be overextended for conservative intraday entry");

  const buySell = buySellRatio(market.txns?.h1 || market.txns?.h24);
  const volumeConfirmation = evaluateVolumeConfirmation(market, buySell);

  return {
    structureScore: Math.min(30, structureScore),
    setup: structureScore >= 14 && !overextended,
    entryTrigger:
      structureScore >= 20 &&
      volumeConfirmation.confirmed &&
      !overextended &&
      Number.isFinite(price),
    overextended,
    volumeConfirmation,
    support: stats.support || (price ? price * 0.92 : null),
    resistance: stats.resistance || (price ? price * 1.18 : null),
    vwap: stats.vwap,
    dayHigh: stats.dayHigh,
    dayLow: stats.dayLow,
    indicators,
    reasons,
    warnings,
  };
}

function klineStats(kline) {
  const rows = kline.filter(
    (row) =>
      Number.isFinite(row.close) &&
      Number.isFinite(row.high) &&
      Number.isFinite(row.low),
  );
  if (rows.length < 8) {
    return { hasEnoughCandles: false };
  }

  const dayHigh = Math.max(...rows.map((row) => row.high));
  const dayLow = Math.min(...rows.map((row) => row.low));
  const support = Math.min(...rows.slice(-8).map((row) => row.low));
  const resistance = Math.max(...rows.slice(-16).map((row) => row.high));
  const volumeSum = rows.reduce((sum, row) => sum + (row.volume || 0), 0);
  const vwap =
    volumeSum > 0
      ? rows.reduce((sum, row) => sum + row.close * (row.volume || 0), 0) / volumeSum
      : rows.reduce((sum, row) => sum + row.close, 0) / rows.length;

  const last = rows[rows.length - 1];
  const previous = rows.slice(-8, -1);
  const previousLow = Math.min(...previous.map((row) => row.low));

  return {
    hasEnoughCandles: true,
    dayHigh,
    dayLow,
    support,
    resistance,
    vwap,
    higherLow: last.low > previousLow,
    lastCloseNearHigh: dayHigh > 0 && last.close >= dayHigh * 0.92,
  };
}

function evaluateVolumeConfirmation(market, buySell) {
  const volume1h = toNumber(market.volume1h, null);
  const volume24h = toNumber(market.volume24h, null);
  const h1Share =
    Number.isFinite(volume1h) && Number.isFinite(volume24h) && volume24h > 0
      ? volume1h / volume24h
      : null;

  const confirmed =
    (Number.isFinite(h1Share) && h1Share >= 0.025) ||
    (Number.isFinite(buySell) && buySell >= 1.05);

  return {
    confirmed,
    buySellRatio: buySell,
    h1VolumeShare: h1Share,
    reasons: confirmed
      ? ["Volume supports the move"]
      : ["Volume confirmation is weak or unavailable"],
  };
}

function buySellRatio(txnBucket) {
  const buys = toNumber(txnBucket?.buys, null);
  const sells = toNumber(txnBucket?.sells, null);
  if (!Number.isFinite(buys) || !Number.isFinite(sells) || sells <= 0) return null;
  return buys / sells;
}

function computeIndicators(kline) {
  const rows = kline.filter(
    (row) =>
      Number.isFinite(row.close) &&
      Number.isFinite(row.high) &&
      Number.isFinite(row.low),
  );
  const closes = rows.map((row) => row.close);

  const ema9 = last(ema(closes, 9));
  const ema21 = last(ema(closes, 21));
  const ma20 = last(sma(closes, 20));
  const ma50 = last(sma(closes, 50));
  const bollinger = bollingerBands(closes, 20, 2);
  const sar = parabolicSar(rows, 0.02, 0.2);
  const latestClose = last(closes);

  return {
    ema: {
      ema9,
      ema21,
    },
    ma: {
      ma20,
      ma50,
    },
    bollinger,
    sar,
    hasEmaSignal:
      Number.isFinite(latestClose) &&
      Number.isFinite(ema9) &&
      Number.isFinite(ema21) &&
      ema9 > ema21 &&
      latestClose >= ema9,
    hasMaSignal:
      Number.isFinite(latestClose) &&
      Number.isFinite(ma20) &&
      Number.isFinite(ma50) &&
      ma20 > ma50 &&
      latestClose >= ma20,
  };
}

function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return [];
  const output = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) output.push(sum / period);
  }
  return output;
}

function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return [];
  const output = [];
  const multiplier = 2 / (period + 1);
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  output.push(previous);

  for (let i = period; i < values.length; i += 1) {
    previous = values[i] * multiplier + previous * (1 - multiplier);
    output.push(previous);
  }

  return output;
}

function bollingerBands(values, period = 20, stdMultiplier = 2) {
  if (!Array.isArray(values) || values.length < period) return null;
  const window = values.slice(-period);
  const middle = window.reduce((sum, value) => sum + value, 0) / period;
  const variance =
    window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = middle + stdDev * stdMultiplier;
  const lower = middle - stdDev * stdMultiplier;
  const latest = last(values);
  const bandWidth = middle > 0 ? (upper - lower) / middle : null;

  return {
    period,
    middle,
    upper,
    lower,
    bandWidth,
    position: bollingerPosition(latest, lower, middle, upper),
  };
}

function bollingerPosition(price, lower, middle, upper) {
  if (!Number.isFinite(price)) return "unknown";
  if (price > upper) return "above_upper";
  if (price < lower) return "below_lower";
  if (price >= middle) return "upper_half";
  return "lower_half";
}

function parabolicSar(rows, step = 0.02, maxStep = 0.2) {
  if (!Array.isArray(rows) || rows.length < 5) return null;

  let bullish = rows[1].close >= rows[0].close;
  let acceleration = step;
  let extremePoint = bullish
    ? Math.max(rows[0].high, rows[1].high)
    : Math.min(rows[0].low, rows[1].low);
  let sar = bullish
    ? Math.min(rows[0].low, rows[1].low)
    : Math.max(rows[0].high, rows[1].high);

  for (let i = 2; i < rows.length; i += 1) {
    const current = rows[i];
    const prev1 = rows[i - 1];
    const prev2 = rows[i - 2];

    sar = sar + acceleration * (extremePoint - sar);

    if (bullish) {
      sar = Math.min(sar, prev1.low, prev2.low);
      if (current.low < sar) {
        bullish = false;
        sar = extremePoint;
        extremePoint = current.low;
        acceleration = step;
      } else if (current.high > extremePoint) {
        extremePoint = current.high;
        acceleration = Math.min(acceleration + step, maxStep);
      }
    } else {
      sar = Math.max(sar, prev1.high, prev2.high);
      if (current.high > sar) {
        bullish = true;
        sar = extremePoint;
        extremePoint = current.high;
        acceleration = step;
      } else if (current.low < extremePoint) {
        extremePoint = current.low;
        acceleration = Math.min(acceleration + step, maxStep);
      }
    }
  }

  const latest = last(rows);
  return {
    value: sar,
    trend: bullish && latest.close >= sar ? "bullish" : "bearish",
    acceleration,
    extremePoint,
  };
}

function last(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values[values.length - 1];
}

module.exports = {
  analyzeTechnical,
  buySellRatio,
  bollingerBands,
  computeIndicators,
  ema,
  klineStats,
  parabolicSar,
  sma,
};
