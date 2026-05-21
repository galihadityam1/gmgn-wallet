# Multi Wallet Tracker Design

## Goal

Add a local wallet holdings tracker to the GMGN terminal scanner project.

The tracker must monitor one or more Solana wallets, display token holdings, and show personal PnL data in a terminal dashboard and Express web view. It is for monitoring only. It must not execute trades or sign transactions.

## Default Wallet

Use the user's wallet as the default example:

```text
5FMHJSu4GT7FLBELnFQxRykmiYWiEuUD45k1eb67NebJ
```

Do not keep the previous friend wallet as a default value.

## Configuration

Add environment support for multi-wallet tracking:

```env
WALLET_ADDRESSES=5FMHJSu4GT7FLBELnFQxRykmiYWiEuUD45k1eb67NebJ
WALLET_REFRESH_SECONDS=2
```

`WALLET_ADDRESSES` accepts comma-separated Solana wallet addresses.

Example:

```env
WALLET_ADDRESSES=wallet1,wallet2,wallet3
```

Optional future labels can be added later, but the first version keeps parsing simple and stable.

## Data Source

Fetch holdings with GMGN CLI:

```bash
gmgn-cli portfolio holdings --chain sol --wallet <wallet>
```

The implementation must not assume `gmgn-cli` is globally installed. It should resolve the command in this order:

1. Local project binary: `node_modules/.bin/gmgn-cli`
2. Fallback command: `npx gmgn-cli`

This matches the existing local project setup and avoids depending on global shell state.

## Terminal Command

Add:

```bash
node bin/gmgn-scanner.js wallet
```

Optional one-shot:

```bash
node bin/gmgn-scanner.js wallet --once
```

The live command refreshes every `WALLET_REFRESH_SECONDS`.

## Terminal Output

For each wallet, render a separate section:

```text
WALLET 5FMH...NebJ

# SYMBOL   MY VALUE   MKT CAP   EST. RETURN   REALIZED PNL   UNREALIZED PNL
1 TOKEN    $12.40     $1.2M     $14.80        +8.2%          +$2.40 / +19.4%
```

Remove the old `VOL ($)` column.

`UNREALIZED PNL` must show both:

- USD amount
- percentage

If GMGN only provides unrealized ratio, derive USD unrealized amount from:

```text
unrealized_usd = usd_value * unrealized_profit_pnl
```

If GMGN provides a direct unrealized USD field, prefer the direct field.

## Web View

Add an Express page:

```text
/wallet
```

Add a JSON endpoint:

```text
/api/wallet
```

The web page should show the same multi-wallet holdings grouped by wallet. It should fit the existing plain HTML dashboard style.

## Storage

Do not write wallet snapshots to Postgres in the first implementation.

Reason:

- Refresh can be as low as 2 seconds.
- Persisting every refresh would quickly create noisy storage.
- PnL history can be added later with lower-frequency sampling.

## Error Handling

If one wallet fails to fetch, the tracker should still show other wallets.

Errors should be displayed per wallet, for example:

```text
WALLET 5FMH...NebJ
Syncing with GMGN networks... checking wallet status...
```

If no wallet is configured, show a clear message explaining that `WALLET_ADDRESSES` must be set.

## Testing

Add focused tests for:

- parsing comma-separated wallet addresses
- formatting unrealized PnL as USD and percent
- removing the volume column from terminal rows
- local GMGN CLI command resolution behavior where practical

Manual smoke tests:

```bash
node bin/gmgn-scanner.js wallet --once
node bin/gmgn-scanner.js wallet
node bin/gmgn-scanner.js web --port 3001
```

Then open:

```text
http://localhost:3001/wallet
```

