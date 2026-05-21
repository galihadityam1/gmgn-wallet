const { readWatchlist } = require("../data/watchlist");
const {
  extractCandidateRows,
  mergeMarketData,
  normalizeCandidate,
} = require("../data/normalize");
const { mapLimit } = require("../utils/async");

class MarketDataService {
  constructor({ config, gmgn, dexscreener }) {
    this.config = config;
    this.gmgn = gmgn;
    this.dexscreener = dexscreener;
  }

  async discoverCandidates(options = {}) {
    const errors = [];
    const candidates = [];

    if (this.gmgn) {
      try {
        const raw = await this.gmgn.getTrending({
          limit: options.limit || this.config.scanLimit,
          interval: options.interval || this.config.gmgnInterval,
          orderBy: options.orderBy || this.config.gmgnOrderBy,
        });
        candidates.push(
          ...extractCandidateRows(raw)
            .map((row) => normalizeCandidate(row, "gmgn"))
            .filter(Boolean),
        );
      } catch (err) {
        errors.push(`GMGN discovery failed: ${err.message}`);
      }
    }

    if (candidates.length === 0 && this.dexscreener) {
      try {
        const profiles = await this.dexscreener.getLatestProfiles();
        candidates.push(
          ...profiles
            .map((row) => normalizeCandidate(row, "dexscreener-profile"))
            .filter(Boolean),
        );
      } catch (err) {
        errors.push(`DexScreener fallback discovery failed: ${err.message}`);
      }
    }

    const watchlist = readWatchlist(this.config).map((row) => ({
      chain: "sol",
      address: row.address,
      symbol: "WATCHLIST",
      source: "watchlist",
      note: row.note || "",
      raw: row,
    }));

    return {
      candidates: dedupeCandidates([...watchlist, ...candidates]).slice(
        0,
        options.limit || this.config.scanLimit,
      ),
      errors,
    };
  }

  async enrichCandidates(candidates, options = {}) {
    const dexPairs = await this.fetchDexPairs(candidates.map((row) => row.address));
    const gmgnBundles = new Map();

    if (options.fullGmgn && this.gmgn) {
      await mapLimit(candidates, options.gmgnConcurrency || 3, async (candidate) => {
        try {
          gmgnBundles.set(candidate.address, await this.gmgn.getTokenBundle(candidate.address));
        } catch (err) {
          gmgnBundles.set(candidate.address, { errors: [err.message] });
        }
      });
    }

    return candidates.map((candidate) => {
      const tokenPairs = dexPairs.filter((pair) => pairContainsAddress(pair, candidate.address));
      const gmgnData = gmgnBundles.get(candidate.address) || { info: candidate.raw };
      return mergeMarketData(candidate, gmgnData, tokenPairs);
    });
  }

  async getTokenMarketData(address, options = {}) {
    const candidate = {
      chain: "sol",
      address,
      symbol: "TOKEN",
      source: "manual",
      raw: { address },
    };

    const [dexPairs, gmgnData] = await Promise.all([
      this.fetchDexPairs([address]),
      this.gmgn
        ? this.gmgn.getTokenBundle(address).catch((err) => ({ errors: [err.message] }))
        : Promise.resolve({ errors: ["GMGN client unavailable"] }),
    ]);

    return mergeMarketData(candidate, options.gmgnData || gmgnData, dexPairs);
  }

  async fetchDexPairs(addresses) {
    if (!this.dexscreener) return [];

    const unique = [...new Set(addresses.filter(Boolean))];
    const chunks = [];
    for (let i = 0; i < unique.length; i += 30) {
      chunks.push(unique.slice(i, i + 30));
    }

    const results = [];
    for (const chunk of chunks) {
      try {
        const rows = await this.dexscreener.getTokens(chunk);
        if (Array.isArray(rows)) results.push(...rows);
      } catch (_) {
        for (const address of chunk) {
          try {
            const rows = await this.dexscreener.getTokenPairs(address);
            if (Array.isArray(rows)) results.push(...rows);
          } catch (_) {
            // Missing fallback data should reduce data quality, not crash scanning.
          }
        }
      }
    }

    return results;
  }
}

function pairContainsAddress(pair, address) {
  const target = String(address || "").toLowerCase();
  return (
    pair?.baseToken?.address?.toLowerCase() === target ||
    pair?.quoteToken?.address?.toLowerCase() === target
  );
}

function dedupeCandidates(candidates) {
  const seen = new Map();
  for (const candidate of candidates) {
    if (!candidate.address) continue;
    const key = candidate.address.toLowerCase();
    if (!seen.has(key) || candidate.source === "watchlist") {
      seen.set(key, candidate);
    }
  }
  return [...seen.values()];
}

module.exports = {
  MarketDataService,
  dedupeCandidates,
};
