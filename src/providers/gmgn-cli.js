const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const { parsePossiblyNoisyJson } = require("../utils/json");

const execFileAsync = promisify(execFile);

class GmgnCliClient {
  constructor(config, options = {}) {
    this.config = config;
    this.timeoutMs = options.timeoutMs || 45_000;
    this.command = options.command || null;
  }

  async run(args) {
    if (!this.config.useGmgnCli) {
      throw new Error("GMGN CLI is disabled by config");
    }

    if (!this.config.gmgnApiKey) {
      throw new Error("GMGN_API_KEY is missing");
    }

    const command = this.command || resolveGmgnCliCommand(this.config.cwd);
    const finalArgs = [...command.baseArgs, ...args];
    if (!finalArgs.includes("--raw")) {
      finalArgs.push("--raw");
    }

    const { stdout, stderr } = await execFileAsync(command.bin, finalArgs, {
      cwd: this.config.cwd,
      encoding: "utf8",
      timeout: this.timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        GMGN_API_KEY: this.config.gmgnApiKey,
        NO_COLOR: "1",
      },
    });

    if (!stdout.trim() && stderr.trim()) {
      throw new Error(stderr.trim());
    }

    return parsePossiblyNoisyJson(stdout);
  }

  async getTrending({ limit, interval, orderBy }) {
    return this.run([
      "market",
      "trending",
      "--chain",
      this.config.chain,
      "--interval",
      interval || this.config.gmgnInterval,
      "--limit",
      String(limit || this.config.scanLimit),
      "--order-by",
      orderBy || this.config.gmgnOrderBy,
      "--direction",
      "desc",
      "--filter",
      "not_wash_trading",
    ]);
  }

  async getTokenInfo(address) {
    return this.run([
      "token",
      "info",
      "--chain",
      this.config.chain,
      "--address",
      address,
    ]);
  }

  async getTokenSecurity(address) {
    return this.run([
      "token",
      "security",
      "--chain",
      this.config.chain,
      "--address",
      address,
    ]);
  }

  async getTokenPool(address) {
    return this.run([
      "token",
      "pool",
      "--chain",
      this.config.chain,
      "--address",
      address,
    ]);
  }

  async getKline(address, { resolution = "15m", from, to } = {}) {
    const args = [
      "market",
      "kline",
      "--chain",
      this.config.chain,
      "--address",
      address,
      "--resolution",
      resolution,
    ];

    if (from) args.push("--from", String(from));
    if (to) args.push("--to", String(to));

    return this.run(args);
  }

  async getPortfolioHoldings(wallet) {
    return this.run([
      "portfolio",
      "holdings",
      "--chain",
      this.config.chain,
      "--wallet",
      wallet,
    ]);
  }

  async getTokenBundle(address) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 24 * 60 * 60;

    const [info, security, pool, kline] = await Promise.allSettled([
      this.getTokenInfo(address),
      this.getTokenSecurity(address),
      this.getTokenPool(address),
      this.getKline(address, { resolution: "15m", from, to: now }),
    ]);

    return {
      info: settledValue(info),
      security: settledValue(security),
      pool: settledValue(pool),
      kline: settledValue(kline),
      errors: [info, security, pool, kline]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason.message),
    };
  }
}

function resolveGmgnCliCommand(cwd) {
  const localBin = path.join(cwd, "node_modules", ".bin", process.platform === "win32" ? "gmgn-cli.cmd" : "gmgn-cli");
  if (fs.existsSync(localBin)) {
    return { bin: localBin, baseArgs: [] };
  }
  return { bin: "npx", baseArgs: ["--yes", "gmgn-cli"] };
}

function settledValue(result) {
  return result.status === "fulfilled" ? result.value : null;
}

module.exports = {
  GmgnCliClient,
  resolveGmgnCliCommand,
};
