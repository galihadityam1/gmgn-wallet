const { FILTER_MODES } = require("../config");
const { colors } = require("../utils/format");

function renderConfig(config, storage) {
  console.log(colors.cyan("GMGN Scanner Config"));
  console.log(`Chain: sol`);
  console.log(`Filter mode: ${config.filterMode}`);
  console.log(`Thresholds: ${JSON.stringify(FILTER_MODES[config.filterMode])}`);
  console.log(`Refresh seconds: ${config.refreshSeconds}`);
  console.log(`Scan limit: ${config.scanLimit}`);
  console.log(`GMGN order: ${config.gmgnOrderBy} / ${config.gmgnInterval}`);
  console.log(`Wallet tracker: ${config.walletAddresses.length} wallet(s), refresh ${config.walletRefreshSeconds}s`);
  console.log(`AI: ${config.ai.enabled ? "enabled" : "disabled"} (${config.ai.provider}, ${config.ai.model})`);
  console.log(`Ollama base URL: ${config.ai.ollamaBaseUrl}`);
  console.log("");
  console.log("Secrets:");
  for (const [key, isSet] of Object.entries(config.envStatus)) {
    console.log(`- ${key}: ${isSet ? "set" : "missing"}`);
  }
  console.log("");
  console.log(`Storage: ${storage.enabled ? "postgres enabled" : `disabled (${storage.reason})`}`);
}

module.exports = {
  renderConfig,
};
