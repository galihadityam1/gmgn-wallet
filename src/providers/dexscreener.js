const { toNumber } = require("../utils/number");

class DexScreenerClient {
  constructor(config, options = {}) {
    this.config = config;
    this.baseUrl = options.baseUrl || "https://api.dexscreener.com";
    this.timeoutMs = options.timeoutMs || 12_000;
  }

  async fetchJson(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`DexScreener ${res.status} for ${path}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getTokenPairs(address) {
    const encoded = encodeURIComponent(address);
    return this.fetchJson(`/token-pairs/v1/${this.config.dexscreenerChain}/${encoded}`);
  }

  async getTokens(addresses) {
    const unique = [...new Set(addresses.filter(Boolean))].slice(0, 30);
    if (unique.length === 0) return [];
    const encoded = unique.map(encodeURIComponent).join(",");
    return this.fetchJson(`/tokens/v1/${this.config.dexscreenerChain}/${encoded}`);
  }

  async getLatestProfiles() {
    const rows = await this.fetchJson("/token-profiles/latest/v1");
    return Array.isArray(rows)
      ? rows.filter((row) => row.chainId === this.config.dexscreenerChain)
      : [];
  }
}

function selectBestPair(pairs, tokenAddress) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  const normalizedAddress = String(tokenAddress || "").toLowerCase();

  return pairs
    .filter((pair) => {
      const base = pair.baseToken?.address?.toLowerCase();
      const quote = pair.quoteToken?.address?.toLowerCase();
      return !normalizedAddress || base === normalizedAddress || quote === normalizedAddress;
    })
    .sort((a, b) => toNumber(b.liquidity?.usd, 0) - toNumber(a.liquidity?.usd, 0))[0];
}

module.exports = {
  DexScreenerClient,
  selectBestPair,
};
