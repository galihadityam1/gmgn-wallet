const test = require("node:test");
const assert = require("node:assert/strict");

const { buildConfig } = require("../src/config");
const { analyzeToken } = require("../src/analysis/signal-engine");
const { computeIndicators } = require("../src/analysis/technical");
const { evaluateSafety } = require("../src/analysis/safety-gate");
const { suggestSize } = require("../src/analysis/trade-plan");
const { sortAnalyses } = require("../src/scanner-service");

function config(overrides = {}) {
  return {
    ...buildConfig({ overrides: { mode: "conservative" } }),
    ...overrides,
  };
}

function matureMarket(extra = {}) {
  return {
    chain: "sol",
    address: "So11111111111111111111111111111111111111112",
    symbol: "TEST",
    priceUsd: 1,
    liquidityUsd: 150_000,
    volume24h: 300_000,
    volume1h: 20_000,
    marketCap: 2_500_000,
    ageDays: 30,
    priceChange: { m5: 1, h1: 3, h6: 8, h24: 20 },
    txns: { h1: { buys: 120, sells: 80 } },
    kline: Array.from({ length: 16 }, (_, index) => ({
      time: Date.now() - (16 - index) * 900_000,
      open: 0.9 + index * 0.006,
      high: 0.94 + index * 0.008,
      low: 0.86 + index * 0.006,
      close: 0.91 + index * 0.008,
      volume: 10_000 + index * 1000,
    })),
    sources: { market: "fixture" },
    ...extra,
  };
}

test("safety gate passes mature liquid token", () => {
  const safety = evaluateSafety(matureMarket(), "conservative");
  assert.equal(safety.passed, true);
  assert.equal(safety.result, "PASS");
});

test("safety gate blocks low liquidity token", () => {
  const safety = evaluateSafety(matureMarket({ liquidityUsd: 10_000 }), "conservative");
  assert.equal(safety.passed, false);
  assert.equal(safety.result, "LOW_LIQ");
});

test("safety gate does not treat renounced freeze fields as risk", () => {
  const safety = evaluateSafety(
    matureMarket({ security: { renounced_freeze_account: true } }),
    "conservative",
  );
  assert.equal(safety.riskFlag, false);
  assert.equal(safety.passed, true);
});

test("analysis can produce entry-ready for strong conservative setup", () => {
  const analysis = analyzeToken(matureMarket(), config());
  assert.equal(analysis.status, "ENTRY_READY");
  assert.ok(analysis.score.total >= 80);
  assert.ok(analysis.plan.rewardRisk >= 1.5);
  assert.equal(analysis.plan.basis, "market_cap");
  assert.equal(analysis.plan.entry, analysis.market.marketCap);
});

test("analysis marks missing core fields as low data", () => {
  const analysis = analyzeToken(
    matureMarket({ ageDays: null, liquidityUsd: null, volume24h: null }),
    config(),
  );
  assert.equal(analysis.status, "WATCH_LOW_DATA");
  assert.equal(analysis.filterResult, "LOW_DATA");
});

test("young token is watch-only, not avoid, when other data is healthy", () => {
  const analysis = analyzeToken(matureMarket({ ageDays: 2 }), config());
  assert.equal(analysis.status, "WATCH");
  assert.equal(analysis.filterResult, "LOW_AGE");
});

test("technical analysis computes EMA, MA, Bollinger, and SAR indicators", () => {
  const kline = Array.from({ length: 60 }, (_, index) => ({
    open: 1 + index * 0.01,
    high: 1.04 + index * 0.01,
    low: 0.96 + index * 0.01,
    close: 1.01 + index * 0.01,
    volume: 1000 + index * 10,
  }));
  const indicators = computeIndicators(kline);

  assert.ok(Number.isFinite(indicators.ema.ema9));
  assert.ok(Number.isFinite(indicators.ema.ema21));
  assert.ok(Number.isFinite(indicators.ma.ma20));
  assert.ok(Number.isFinite(indicators.ma.ma50));
  assert.ok(Number.isFinite(indicators.bollinger.upper));
  assert.ok(Number.isFinite(indicators.sar.value));
  assert.equal(indicators.hasEmaSignal, true);
  assert.equal(indicators.hasMaSignal, true);
});

test("position sizing stays inside configured SOL bounds", () => {
  const size = suggestSize(
    config({ minPositionSol: 0.05, maxPositionSol: 0.2, defaultCapitalSol: 0.2 }),
    0.1,
    90,
  );
  assert.ok(size >= 0.05);
  assert.ok(size <= 0.2);
});

test("sort puts entry-ready signals above watch candidates", () => {
  const ready = { status: "ENTRY_READY", score: { total: 80 } };
  const watch = { status: "WATCH", score: { total: 99 } };
  assert.deepEqual([watch, ready].sort(sortAnalyses), [ready, watch]);
});
