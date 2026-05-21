const path = require("node:path");
const { loadEnv } = require("./utils/env");
const { toNumber } = require("./utils/number");

const FILTER_MODES = {
  conservative: {
    minAgeDays: 7,
    minLiquidityUsd: 50_000,
    minVolume24hUsd: 100_000,
  },
  strict: {
    minAgeDays: 14,
    minLiquidityUsd: 100_000,
    minVolume24hUsd: 250_000,
  },
};

function boolFromEnv(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "y", "on"].includes(String(value).toLowerCase());
}

function parseWalletAddresses(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildConfig({ cwd = process.cwd(), overrides = {} } = {}) {
  const env = loadEnv(cwd);
  const filterMode = overrides.mode || env.FILTER_MODE || "conservative";
  const mode = FILTER_MODES[filterMode] ? filterMode : "conservative";

  return {
    cwd,
    chain: "sol",
    dexscreenerChain: "solana",
    gmgnApiKey: env.GMGN_API_KEY || "",
    databaseUrl: env.DATABASE_URL || "",
    birdeyeApiKey: env.BIRDEYE_API_KEY || "",
    heliusApiKey: env.HELIUS_API_KEY || "",
    solanaRpcUrl: env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    filterMode: mode,
    filters: FILTER_MODES[mode],
    refreshSeconds: toNumber(overrides.refresh, toNumber(env.REFRESH_SECONDS, 45)),
    scanLimit: toNumber(overrides.limit, toNumber(env.SCAN_LIMIT, 30)),
    port: toNumber(overrides.port, toNumber(env.PORT, 3000)),
    gmgnOrderBy: overrides.orderBy || env.GMGN_ORDER_BY || "liquidity",
    gmgnInterval: overrides.interval || env.GMGN_INTERVAL || "24h",
    minPositionSol: toNumber(env.MIN_POSITION_SOL, 0.05),
    maxPositionSol: toNumber(env.MAX_POSITION_SOL, 0.2),
    defaultCapitalSol: toNumber(env.DEFAULT_CAPITAL_SOL, null),
    maxRiskPerTradeSol: toNumber(env.MAX_RISK_PER_TRADE_SOL, null),
    walletAddresses: parseWalletAddresses(env.WALLET_ADDRESSES),
    walletRefreshSeconds: toNumber(env.WALLET_REFRESH_SECONDS, 2),
    ai: {
      enabled: boolFromEnv(env.AI_ENABLED, false),
      provider: env.AI_PROVIDER || "ollama",
      ollamaBaseUrl: env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: env.AI_MODEL || "qwen3:8b",
      embedModel: env.AI_EMBED_MODEL || "nomic-embed-text",
      timeoutMs: toNumber(env.AI_TIMEOUT_MS, 60_000),
      reviewEntryReady: boolFromEnv(env.AI_REVIEW_ENTRY_READY, true),
      concurrency: toNumber(env.AI_REVIEW_CONCURRENCY, 1),
    },
    useGmgnCli: boolFromEnv(env.DISABLE_GMGN_CLI, false) === false,
    dataDir: path.join(cwd, "data"),
    envStatus: {
      GMGN_API_KEY: Boolean(env.GMGN_API_KEY),
      DATABASE_URL: Boolean(env.DATABASE_URL),
      BIRDEYE_API_KEY: Boolean(env.BIRDEYE_API_KEY),
      HELIUS_API_KEY: Boolean(env.HELIUS_API_KEY),
      AI_ENABLED: boolFromEnv(env.AI_ENABLED, false),
      OLLAMA_BASE_URL: Boolean(env.OLLAMA_BASE_URL || "http://localhost:11434"),
      AI_MODEL: Boolean(env.AI_MODEL || "qwen3:8b"),
      WALLET_ADDRESSES: Boolean(env.WALLET_ADDRESSES),
    },
  };
}

module.exports = {
  FILTER_MODES,
  buildConfig,
  parseWalletAddresses,
};
