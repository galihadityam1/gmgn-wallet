const {
  colors,
  formatUsd,
  pad,
  shortAddress,
  truncate,
} = require("../utils/format");

function renderWalletDashboard(result, config) {
  console.clear();
  console.log(colors.cyan("GMGN Wallet Tracker"));
  console.log(
    colors.dim(
      `updated=${new Date(result.updatedAt).toLocaleTimeString()} refresh=${config.walletRefreshSeconds}s`,
    ),
  );
  console.log("");

  if (!result.configured) {
    console.log(
      colors.yellow("No wallets configured. Set WALLET_ADDRESSES in .env."),
    );
    return;
  }

  for (const wallet of result.wallets) {
    renderWalletSection(wallet);
    console.log("");
  }
}

function renderWalletSection(wallet) {
  console.log(
    colors.bold(`WALLET ${shortAddress(wallet.address)}  ${wallet.address}`),
  );
  console.log(
    `SOL balance: ${formatSolBalance(wallet.solBalance)} | Token value: ${formatUsd(wallet.totalTokenValueUsd)} | Total value: ${formatUsd(wallet.totalValueUsd)}`,
  );

  if (wallet.error) {
    console.log(
      colors.yellow("Syncing with GMGN networks... checking wallet status..."),
    );
    console.log(colors.dim(wallet.error));
    return;
  }

  if (!wallet.holdings.length) {
    console.log(colors.yellow("No active token positions found in wallet."));
    return;
  }

  console.log("-".repeat(108));
  console.log(
    [
      pad("#", 4, "left"),
      pad("SYMBOL", 14, "left"),
      pad("MY VALUE", 13),
      pad("EST. RETURN", 15),
      pad("MKT CAP", 13),
      pad("REALIZED PNL", 15),
      pad("UNREALIZED PNL", 26),
    ].join(" "),
  );
  console.log("-".repeat(108));

  wallet.holdings.forEach((holding, index) => {
    console.log(
      [
        pad(String(index + 1), 4, "left"),
        pad(
          truncate(String(holding.symbol || "UNKNOWN").toUpperCase(), 14),
          14,
          "left",
        ),
        pad(formatUsd(holding.valueUsd), 13),
        pad(formatUsd(holding.estimatedReturnUsd), 15),
        pad(formatUsd(holding.marketCapUsd), 13),
        pad(colorPct(holding.realizedPnlPct), 15),
        pad(formatUnrealized(holding), 26),
      ].join(" "),
    );
  });

  console.log("-".repeat(108));
  console.log(`Total token value: ${formatUsd(wallet.totalTokenValueUsd)}`);
  console.log(`Total wallet value: ${formatUsd(wallet.totalValueUsd)}`);
}

function formatSolBalance(solBalance) {
  if (!Number.isFinite(solBalance?.sol)) return "-";
  const value = Number.isFinite(solBalance.valueUsd)
    ? ` / ${formatUsd(solBalance.valueUsd)}`
    : "";
  return `${solBalance.sol.toFixed(4)} SOL${value}`;
}

function formatUnrealized(holding) {
  const usd = Number.isFinite(holding.unrealizedPnlUsd)
    ? formatUsd(holding.unrealizedPnlUsd)
    : "-";
  const pct = Number.isFinite(holding.unrealizedPnlPct)
    ? `${signed(holding.unrealizedPnlPct)}%`
    : "-";
  const text = `${usd} / ${pct}`;
  if (
    !Number.isFinite(holding.unrealizedPnlUsd) &&
    !Number.isFinite(holding.unrealizedPnlPct)
  )
    return text;
  const marker = Number.isFinite(holding.unrealizedPnlUsd)
    ? holding.unrealizedPnlUsd
    : holding.unrealizedPnlPct;
  return marker >= 0 ? colors.green(text) : colors.red(text);
}

function colorPct(value) {
  if (!Number.isFinite(value)) return "-";
  const text = `${signed(value)}%`;
  return value >= 0 ? colors.green(text) : colors.red(text);
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

module.exports = {
  formatSolBalance,
  formatUnrealized,
  renderWalletDashboard,
};
