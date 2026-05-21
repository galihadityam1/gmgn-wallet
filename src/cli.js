const { createApp } = require("./app");
const { addWatchlistToken, readWatchlist, removeWatchlistToken } = require("./data/watchlist");
const { renderConfig } = require("./render/config");
const { renderAlerts, renderDashboard } = require("./render/dashboard");
const { renderDetail } = require("./render/detail");
const { renderHistory } = require("./render/history");
const { renderWalletDashboard } = require("./render/wallet");
const { startServer } = require("./web/server");

async function runCli(argv) {
  const { command, args, options } = parseArgs(argv);
  const app = await createApp(options);

  try {
    switch (command) {
      case "scan":
        await runScan(app, options);
        break;
      case "detail":
        await runDetail(app, args[0]);
        break;
      case "watchlist":
        await runWatchlist(app, args);
        break;
      case "history":
        await runHistory(app, args[0]);
        break;
      case "config":
        renderConfig(app.config, app.storage);
        break;
      case "ai":
        await runAi(app, args);
        break;
      case "outcome":
        await runOutcome(app, args);
        break;
      case "wallet":
        await runWallet(app, options);
        break;
      case "web":
      case "server":
        await runWeb(app);
        break;
      case "help":
      default:
        printHelp();
        break;
    }
  } finally {
    if (!["scan", "wallet", "web", "server"].includes(command)) {
      await app.storage.close();
    }
  }
}

async function runScan(app, options) {
  const once = Boolean(options.once);

  async function tick() {
    const result = await app.scanner.scan({ limit: app.config.scanLimit });
    renderDashboard({
      analyses: result.analyses,
      config: app.config,
      errors: result.errors,
      storage: app.storage,
    });
    renderAlerts(result.alerts);
  }

  await tick();
  if (once) {
    await app.storage.close();
    return;
  }

  const interval = setInterval(() => {
    tick().catch((err) => {
      console.error(`scan failed: ${err.message}`);
    });
  }, app.config.refreshSeconds * 1000);

  process.on("SIGINT", async () => {
    clearInterval(interval);
    await app.storage.close();
    process.exit(0);
  });
}

async function runDetail(app, address) {
  if (!address) throw new Error("detail requires a token address");
  const analysis = await app.scanner.detail(address);
  renderDetail(analysis, app.storage);
}

async function runWatchlist(app, args) {
  const action = args[0] || "list";
  const address = args[1];

  if (action === "add") {
    const note = args.slice(2).join(" ");
    const result = addWatchlistToken(app.config, address, note);
    console.log(result.added ? "Token added." : "Token already exists.");
    return;
  }

  if (action === "remove") {
    const result = removeWatchlistToken(app.config, address);
    console.log(result.removed ? "Token removed." : "Token not found.");
    return;
  }

  for (const token of readWatchlist(app.config)) {
    console.log(`${token.address}${token.note ? `  ${token.note}` : ""}`);
  }
}

async function runHistory(app, address) {
  const rows = await app.storage.getHistory({ limit: 30, tokenAddress: address || null });
  renderHistory(rows, app.storage);
}

async function runWeb(app) {
  const { port } = await startServer(app);
  console.log(`GMGN scanner web view: http://localhost:${port}`);
  console.log("Press Ctrl+C to stop.");

  process.on("SIGINT", async () => {
    await app.storage.close();
    process.exit(0);
  });
}

async function runWallet(app, options) {
  const once = Boolean(options.once);

  async function tick() {
    const result = await app.walletTracker.getHoldings();
    renderWalletDashboard(result, app.config);
  }

  await tick();
  if (once) {
    await app.storage.close();
    return;
  }

  const interval = setInterval(() => {
    tick().catch((err) => {
      console.error(`wallet tracker failed: ${err.message}`);
    });
  }, app.config.walletRefreshSeconds * 1000);

  process.on("SIGINT", async () => {
    clearInterval(interval);
    await app.storage.close();
    process.exit(0);
  });
}

function parseArgs(argv) {
  const args = [];
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--once") {
      options.once = true;
    } else if (item === "--mode") {
      options.mode = argv[++i];
    } else if (item === "--limit") {
      options.limit = argv[++i];
    } else if (item === "--refresh") {
      options.refresh = argv[++i];
    } else if (item === "--port") {
      options.port = argv[++i];
    } else if (item.startsWith("--")) {
      throw new Error(`Unknown option ${item}`);
    } else {
      args.push(item);
    }
  }

  return {
    command: args.shift() || "help",
    args,
    options,
  };
}

function printHelp() {
  console.log(`GMGN Terminal Scanner

Usage:
  node bin/gmgn-scanner.js scan [--once] [--mode conservative|strict] [--limit 30]
  node bin/gmgn-scanner.js detail <token-address>
  node bin/gmgn-scanner.js watchlist add <token-address> [note]
  node bin/gmgn-scanner.js watchlist remove <token-address>
  node bin/gmgn-scanner.js watchlist list
      node bin/gmgn-scanner.js history [token-address]
  node bin/gmgn-scanner.js ai critic <token-address>
  node bin/gmgn-scanner.js ai explain <token-address>
  node bin/gmgn-scanner.js outcome review
  node bin/gmgn-scanner.js outcome confirm <id> <result> [notes]
  node bin/gmgn-scanner.js wallet [--once]
  node bin/gmgn-scanner.js config
  node bin/gmgn-scanner.js web [--port 3000]
`);
}

async function runAi(app, args) {
  const action = args[0] || "help";
  const address = args[1];

  if (action === "critic" || action === "explain") {
    if (!address) throw new Error(`ai ${action} requires a token address`);
    const analysis = await app.scanner.aiReview(address, { mode: action });
    renderDetail(analysis, app.storage);
    return;
  }

  if (action === "journal") {
    const rows = await app.storage.getHistory({ limit: 20 });
    renderHistory(rows, app.storage);
    return;
  }

  console.log("Usage: node bin/gmgn-scanner.js ai critic <token-address>");
}

async function runOutcome(app, args) {
  const action = args[0] || "review";

  if (action === "review") {
    const rows = await app.storage.getOutcomeReviews({ limit: 30 });
    if (!app.storage.enabled) {
      console.log(`Outcome review unavailable: ${app.storage.reason}`);
      return;
    }
    if (!rows.length) {
      console.log("No pending outcome reviews.");
      return;
    }
    for (const row of rows) {
      console.log(
        `${row.id} ${row.symbol || "UNKNOWN"} ${row.token_address} suggested=${row.suggested_outcome} entry=${row.entry_value || "-"} stop=${row.stop_value || "-"} target=${row.final_target_value || "-"}`,
      );
    }
    return;
  }

  if (action === "confirm") {
    const id = args[1];
    const result = args[2];
    const notes = args.slice(3).join(" ");
    if (!id || !result) throw new Error("outcome confirm requires <id> <result>");
    const row = await app.storage.confirmOutcome(id, result, notes);
    console.log(row ? `Outcome ${id} confirmed as ${result}.` : `Outcome ${id} not found.`);
    return;
  }

  console.log("Usage: node bin/gmgn-scanner.js outcome review");
}

module.exports = {
  parseArgs,
  runCli,
};
