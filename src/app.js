const { buildConfig } = require("./config");
const { GmgnCliClient } = require("./providers/gmgn-cli");
const { DexScreenerClient } = require("./providers/dexscreener");
const { MarketDataService } = require("./providers/market-data");
const { createStorage } = require("./storage");
const { ScannerService } = require("./scanner-service");
const { OllamaAiClient } = require("./ai/ollama-client");
const { AiRiskCritic } = require("./ai/risk-critic");
const { WalletTracker } = require("./wallet/tracker");

async function createApp(overrides = {}) {
  const config = buildConfig({ cwd: process.cwd(), overrides });
  const gmgn = config.gmgnApiKey ? new GmgnCliClient(config) : null;
  const dexscreener = new DexScreenerClient(config);
  const marketData = new MarketDataService({ config, gmgn, dexscreener });
  const storage = await createStorage(config);
  const aiClient =
    config.ai.enabled && config.ai.provider === "ollama"
      ? new OllamaAiClient(config)
      : null;
  const aiCritic = new AiRiskCritic({ config, client: aiClient, storage });
  const scanner = new ScannerService({ config, marketData, storage, aiCritic });
  const walletTracker = new WalletTracker({ config, gmgn });

  return {
    config,
    gmgn,
    dexscreener,
    marketData,
    storage,
    aiClient,
    aiCritic,
    scanner,
    walletTracker,
  };
}

module.exports = {
  createApp,
};
