const fs = require("node:fs");
const path = require("node:path");

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function watchlistPath(config) {
  return path.join(config.dataDir, "watchlist.json");
}

function readWatchlist(config) {
  const file = watchlistPath(config);
  if (!fs.existsSync(file)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed.tokens) ? parsed.tokens : [];
  } catch (_) {
    return [];
  }
}

function writeWatchlist(config, tokens) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(
    watchlistPath(config),
    JSON.stringify({ tokens: sortTokens(tokens) }, null, 2),
    "utf8",
  );
}

function addWatchlistToken(config, address, note = "") {
  assertSolanaAddress(address);
  const current = readWatchlist(config);
  const exists = current.some((row) => row.address === address);
  if (exists) return { added: false, tokens: current };

  const next = [
    ...current,
    {
      address,
      note,
      addedAt: new Date().toISOString(),
    },
  ];
  writeWatchlist(config, next);
  return { added: true, tokens: next };
}

function removeWatchlistToken(config, address) {
  const current = readWatchlist(config);
  const next = current.filter((row) => row.address !== address);
  writeWatchlist(config, next);
  return { removed: next.length !== current.length, tokens: next };
}

function sortTokens(tokens) {
  return [...tokens].sort((a, b) => a.address.localeCompare(b.address));
}

function assertSolanaAddress(address) {
  if (!SOLANA_ADDRESS_RE.test(String(address || ""))) {
    throw new Error("Invalid Solana token address");
  }
}

module.exports = {
  addWatchlistToken,
  assertSolanaAddress,
  readWatchlist,
  removeWatchlistToken,
};
