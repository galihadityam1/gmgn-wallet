const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { parseWalletAddresses } = require("../src/config");
const { resolveGmgnCliCommand } = require("../src/providers/gmgn-cli");
const { formatSolBalance, formatUnrealized } = require("../src/render/wallet");
const { normalizeHolding, normalizeSolBalance, normalizeWalletHoldings } = require("../src/wallet/tracker");

test("parseWalletAddresses parses comma-separated wallet addresses", () => {
  assert.deepEqual(parseWalletAddresses("wallet1, wallet2,,wallet3 "), [
    "wallet1",
    "wallet2",
    "wallet3",
  ]);
});

test("normalizeHolding derives cost basis and unrealized USD from current value and ratio", () => {
  const holding = normalizeHolding({
    usd_value: "12.84",
    unrealized_profit_pnl: "1.8625",
    token: {
      symbol: "test",
      price: "0.5",
      total_supply: "1000000",
    },
  });

  assert.equal(Number(holding.valueUsd.toFixed(2)), 4.49);
  assert.equal(holding.currentValueUsd, 12.84);
  assert.equal(holding.estimatedReturnUsd, 12.84);
  assert.equal(Number(holding.unrealizedPnlUsd.toFixed(2)), 8.35);
  assert.equal(holding.unrealizedPnlPct, 186.25);
  assert.equal(holding.marketCapUsd, 500_000);
});

test("formatUnrealized shows USD and percent", () => {
  const rendered = formatUnrealized({
    unrealizedPnlUsd: 2.5,
    unrealizedPnlPct: 25,
  });

  assert.match(rendered, /\$2\.50/);
  assert.match(rendered, /\+25\.0%/);
});

test("normalizeWalletHoldings includes SOL balance in total wallet value", () => {
  const wallet = normalizeWalletHoldings(
    "wallet",
    {
      holdings: [
        {
          usd_value: "10",
          unrealized_profit_pnl: "1",
          token: { symbol: "TOKEN" },
        },
      ],
    },
    {
      solBalance: 0.5,
      solPriceUsd: 150,
    },
  );

  assert.equal(wallet.solBalance.sol, 0.5);
  assert.equal(wallet.solBalance.valueUsd, 75);
  assert.equal(wallet.totalTokenValueUsd, 10);
  assert.equal(wallet.totalValueUsd, 85);
});

test("normalizeSolBalance can use direct GMGN fields", () => {
  const solBalance = normalizeSolBalance({
    sol_balance: "0.25",
    sol_value_usd: "40",
  });

  assert.equal(solBalance.sol, 0.25);
  assert.equal(solBalance.valueUsd, 40);
  assert.equal(solBalance.priceUsd, 160);
});

test("formatSolBalance shows SOL and USD", () => {
  assert.equal(formatSolBalance({ sol: 0.25, valueUsd: 40 }), "0.2500 SOL / $40.00");
});

test("resolveGmgnCliCommand prefers local project binary", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gmgn-wallet-test-"));
  const binDir = path.join(tempDir, "node_modules", ".bin");
  fs.mkdirSync(binDir, { recursive: true });
  const localBin = path.join(binDir, process.platform === "win32" ? "gmgn-cli.cmd" : "gmgn-cli");
  fs.writeFileSync(localBin, "");

  const command = resolveGmgnCliCommand(tempDir);

  assert.equal(command.bin, localBin);
  assert.deepEqual(command.baseArgs, []);
});
