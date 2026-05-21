const { mapLimit } = require("../utils/async");
const { toNumber } = require("../utils/number");

const SOL_ADDRESS = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

class WalletTracker {
  constructor({ config, gmgn }) {
    this.config = config;
    this.gmgn = gmgn;
  }

  async getHoldings() {
    const wallets = this.config.walletAddresses || [];
    if (!wallets.length) {
      return {
        configured: false,
        wallets: [],
        updatedAt: new Date().toISOString(),
      };
    }

    const results = await mapLimit(wallets, 2, async (address) => {
      try {
        if (!this.gmgn) {
          throw new Error("GMGN_API_KEY is missing");
        }
        const [raw, solBalance, solPriceUsd] = await Promise.all([
          this.gmgn.getPortfolioHoldings(address),
          getSolBalance(this.config, address),
          getSolPriceUsd(),
        ]);
        return normalizeWalletHoldings(address, raw, { solBalance, solPriceUsd });
      } catch (err) {
        return {
          address,
          holdings: [],
          totalValueUsd: 0,
          solBalance: emptySolBalance(),
          error: err.message,
        };
      }
    });

    return {
      configured: true,
      wallets: results,
      updatedAt: new Date().toISOString(),
    };
  }
}

function normalizeWalletHoldings(address, raw, extras = {}) {
  const holdings = (raw?.list || raw?.holdings || raw?.data?.list || raw?.data?.holdings || [])
    .map(normalizeHolding)
    .filter((holding) => holding.valueUsd > 0 || holding.amount > 0);
  const solBalance = normalizeSolBalance(raw, extras);
  const tokenValueUsd = holdings.reduce((sum, holding) => sum + (holding.valueUsd || 0), 0);

  return {
    address,
    holdings,
    solBalance,
    totalTokenValueUsd: tokenValueUsd,
    totalValueUsd: tokenValueUsd + (solBalance.valueUsd || 0),
    error: null,
  };
}

function normalizeHolding(row) {
  const token = row?.token || {};
  const valueUsd = firstFinite(
    row.usd_value,
    row.usdValue,
    row.value_usd,
    row.valueUsd,
    row.current_value_usd,
  );
  const amount = firstFinite(row.amount, row.balance, row.token_amount, row.tokenAmount);
  const price = firstFinite(token.price, row.price, token.price_usd, row.price_usd);
  const totalSupply = firstFinite(token.total_supply, token.totalSupply);
  const computedMarketCap = Number.isFinite(price) && Number.isFinite(totalSupply) ? price * totalSupply : null;
  const realizedRatio = firstFinite(row.realized_profit_pnl, row.realizedPnlRatio, row.realized_pnl_ratio);
  const unrealizedRatio = firstFinite(
    row.unrealized_profit_pnl,
    row.unrealizedPnlRatio,
    row.unrealized_pnl_ratio,
  );
  const directUnrealizedUsd = firstFinite(
    row.unrealized_profit_usd,
    row.unrealized_pnl_usd,
    row.unrealizedProfitUsd,
    row.unrealizedPnlUsd,
  );

  return {
    address: token.address || token.token_address || row.token_address || row.address || "",
    symbol: token.symbol || row.symbol || "UNKNOWN",
    amount,
    valueUsd,
    marketCapUsd: firstFinite(token.market_cap, token.marketCap, computedMarketCap),
    estimatedReturnUsd: Number.isFinite(unrealizedRatio)
      ? valueUsd * (1 + unrealizedRatio)
      : valueUsd + (Number.isFinite(directUnrealizedUsd) ? directUnrealizedUsd : 0),
    realizedPnlPct: Number.isFinite(realizedRatio) ? realizedRatio * 100 : null,
    unrealizedPnlUsd: Number.isFinite(directUnrealizedUsd)
      ? directUnrealizedUsd
      : Number.isFinite(unrealizedRatio)
        ? valueUsd * unrealizedRatio
        : null,
    unrealizedPnlPct: Number.isFinite(unrealizedRatio) ? unrealizedRatio * 100 : null,
    raw: row,
  };
}

function firstFinite(...values) {
  for (const value of values) {
    const number = toNumber(value, null);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

async function getSolBalance(config, walletAddress) {
  const url = config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "gmgn-wallet-balance",
        method: "getBalance",
        params: [walletAddress],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Solana RPC ${res.status}`);
    const json = await res.json();
    const lamports = toNumber(json?.result?.value, null);
    return Number.isFinite(lamports) ? lamports / LAMPORTS_PER_SOL : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getSolPriceUsd() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${SOL_ADDRESS}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DexScreener SOL price ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const best = rows.sort((a, b) => toNumber(b.liquidity?.usd, 0) - toNumber(a.liquidity?.usd, 0))[0];
    return firstFinite(best?.priceUsd, best?.priceNative);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSolBalance(raw, { solBalance = null, solPriceUsd = null } = {}) {
  const directSol = firstFinite(
    raw?.sol_balance,
    raw?.solBalance,
    raw?.native_balance,
    raw?.nativeBalance,
    raw?.data?.sol_balance,
    raw?.data?.solBalance,
    solBalance,
  );
  const directUsd = firstFinite(
    raw?.sol_value_usd,
    raw?.solValueUsd,
    raw?.native_value_usd,
    raw?.nativeValueUsd,
    raw?.data?.sol_value_usd,
    raw?.data?.solValueUsd,
  );
  const priceUsd = firstFinite(solPriceUsd, directUsd && directSol ? directUsd / directSol : null);
  const valueUsd = firstFinite(directUsd, directSol && priceUsd ? directSol * priceUsd : null);

  return {
    sol: directSol,
    priceUsd,
    valueUsd,
  };
}

function emptySolBalance() {
  return {
    sol: null,
    priceUsd: null,
    valueUsd: null,
  };
}

module.exports = {
  emptySolBalance,
  getSolBalance,
  getSolPriceUsd,
  WalletTracker,
  normalizeHolding,
  normalizeSolBalance,
  normalizeWalletHoldings,
};
