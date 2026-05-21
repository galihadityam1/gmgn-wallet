const { toNumber } = require("../utils/number");
const { selectBestPair } = require("../providers/dexscreener");

function getPath(obj, path) {
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, obj);
}

function firstValue(obj, paths, fallback = null) {
  for (const path of paths) {
    const value = getPath(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function unwrapData(raw) {
  if (!raw) return raw;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.data?.list)) return raw.data.list;
  if (Array.isArray(raw.data?.rank)) return raw.data.rank;
  if (Array.isArray(raw.data?.items)) return raw.data.items;
  return raw.data || raw;
}

function extractCandidateRows(raw) {
  const data = unwrapData(raw);
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    return Object.values(data).flatMap((value) => (Array.isArray(value) ? value : []));
  }

  return [];
}

function normalizeCandidate(row, source = "gmgn") {
  const token = row.token || row.baseToken || row.base_token || row;
  const address = firstValue(
    row,
    [
      "address",
      "token_address",
      "base_address",
      "token.address",
      "token.token_address",
      "baseToken.address",
      "base_token.address",
    ],
    firstValue(token, ["address", "token_address"]),
  );

  if (!address) return null;

  return {
    chain: "sol",
    address,
    symbol: String(firstValue(row, ["symbol", "token.symbol", "baseToken.symbol"], "UNKNOWN")).toUpperCase(),
    name: firstValue(row, ["name", "token.name", "baseToken.name"], null),
    source,
    rank: toNumber(firstValue(row, ["rank", "index"], null), null),
    raw: row,
  };
}

function normalizeDexPair(pair, tokenAddress) {
  if (!pair) return {};

  const baseMatches =
    pair.baseToken?.address?.toLowerCase() === String(tokenAddress || "").toLowerCase();
  const token = baseMatches ? pair.baseToken : pair.baseToken || {};

  const pairCreatedAt = toNumber(pair.pairCreatedAt, null);
  const createdMs =
    pairCreatedAt && pairCreatedAt < 10_000_000_000 ? pairCreatedAt * 1000 : pairCreatedAt;
  const ageDays = createdMs ? (Date.now() - createdMs) / 86_400_000 : null;

  return {
    address: tokenAddress || token.address,
    symbol: token.symbol ? String(token.symbol).toUpperCase() : undefined,
    name: token.name,
    priceUsd: toNumber(pair.priceUsd, null),
    priceNative: toNumber(pair.priceNative, null),
    liquidityUsd: toNumber(pair.liquidity?.usd, null),
    volume24h: toNumber(pair.volume?.h24, null),
    volume6h: toNumber(pair.volume?.h6, null),
    volume1h: toNumber(pair.volume?.h1, null),
    volume5m: toNumber(pair.volume?.m5, null),
    marketCap: toNumber(pair.marketCap, null),
    fdv: toNumber(pair.fdv, null),
    pairCreatedAt: createdMs,
    ageDays,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    url: pair.url,
    priceChange: {
      m5: toNumber(pair.priceChange?.m5, null),
      h1: toNumber(pair.priceChange?.h1, null),
      h6: toNumber(pair.priceChange?.h6, null),
      h24: toNumber(pair.priceChange?.h24, null),
    },
    txns: {
      m5: pair.txns?.m5 || null,
      h1: pair.txns?.h1 || null,
      h6: pair.txns?.h6 || null,
      h24: pair.txns?.h24 || null,
    },
    sources: { market: "dexscreener" },
    rawDexPair: pair,
  };
}

function normalizeGmgnMarket(rowOrBundle) {
  const info = rowOrBundle?.info || rowOrBundle || {};
  const token = info.token || info.data?.token || info.data || info;

  const createdAt = toNumber(
    firstValue(token, ["creation_timestamp", "created_at", "open_timestamp", "launch_time"], null),
    null,
  );
  const createdMs = createdAt
    ? createdAt < 10_000_000_000
      ? createdAt * 1000
      : createdAt
    : null;

  const security = rowOrBundle?.security || {};
  const pool = rowOrBundle?.pool || {};

  return {
    address: firstValue(token, ["address", "token_address"], null),
    symbol: firstValue(token, ["symbol"], undefined),
    name: firstValue(token, ["name"], undefined),
    priceUsd: toNumber(firstValue(token, ["price", "price_usd", "usd_price"], null), null),
    liquidityUsd: toNumber(
      firstValue(token, ["liquidity", "liquidity_usd", "pool.liquidity"], null),
      null,
    ),
    volume24h: toNumber(firstValue(token, ["volume_24h", "volume24h", "volume"], null), null),
    marketCap: toNumber(firstValue(token, ["market_cap", "marketcap", "mkt_cap"], null), null),
    fdv: toNumber(firstValue(token, ["fdv"], null), null),
    pairCreatedAt: createdMs,
    ageDays: createdMs ? (Date.now() - createdMs) / 86_400_000 : null,
    holderCount: toNumber(firstValue(token, ["holder_count", "holders"], null), null),
    security,
    pool,
    sources: { gmgn: "gmgn-cli" },
  };
}

function mergeMarketData(candidate, gmgnData = {}, dexPairs = []) {
  const bestPair = selectBestPair(dexPairs, candidate.address);
  const dex = normalizeDexPair(bestPair, candidate.address);
  const gmgn = normalizeGmgnMarket(gmgnData);

  return {
    chain: "sol",
    ...candidate,
    ...dex,
    ...removeNullish(gmgn),
    address: candidate.address,
    symbol: (gmgn.symbol || dex.symbol || candidate.symbol || "UNKNOWN").toUpperCase(),
    name: gmgn.name || dex.name || candidate.name || null,
    sources: {
      ...candidate.sources,
      ...dex.sources,
      ...gmgn.sources,
    },
    security: gmgn.security || gmgnData.security || null,
    pool: gmgn.pool || gmgnData.pool || null,
    kline: normalizeKline(gmgnData.kline),
    providerErrors: gmgnData.errors || [],
    raw: {
      candidate: candidate.raw,
      gmgn: gmgnData,
      dexPair: bestPair,
    },
  };
}

function normalizeKline(raw) {
  const rows = extractCandidateRows(raw);
  return rows
    .map((row) => {
      const time = toNumber(firstValue(row, ["time", "timestamp", "t", "open_time"], null), null);
      return {
        time: time && time < 10_000_000_000 ? time * 1000 : time,
        open: toNumber(firstValue(row, ["open", "o"], null), null),
        high: toNumber(firstValue(row, ["high", "h"], null), null),
        low: toNumber(firstValue(row, ["low", "l"], null), null),
        close: toNumber(firstValue(row, ["close", "c"], null), null),
        volume: toNumber(firstValue(row, ["volume", "v", "volume_usd"], null), null),
      };
    })
    .filter((row) => Number.isFinite(row.close));
}

function removeNullish(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined),
  );
}

module.exports = {
  extractCandidateRows,
  firstValue,
  mergeMarketData,
  normalizeCandidate,
  normalizeDexPair,
  normalizeGmgnMarket,
  normalizeKline,
};
