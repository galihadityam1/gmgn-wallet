# Wallet Tracker

Wallet tracker memakai GMGN CLI untuk membaca holdings wallet Solana.

## Konfigurasi

```bash
WALLET_ADDRESSES=5FMHJSu4GT7FLBELnFQxRykmiYWiEuUD45k1eb67NebJ
WALLET_REFRESH_SECONDS=2
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

Multi-wallet:

```bash
WALLET_ADDRESSES=wallet1,wallet2,wallet3
```

## Cara Menggunakan

Jalankan sekali:

```bash
npm run wallet:once
```

Jalankan live:

```bash
npm run wallet
```

Mode terminal ini lebih ringan daripada membuka halaman `/wallet` di web karena tidak perlu render browser dan hanya menampilkan table holdings.

Web:

```text
http://localhost:3001/wallet
```

## Kolom Wallet Tracker

Ringkasan wallet menampilkan:

- `SOL balance`: saldo native SOL dan estimasi nilai USD.
- `Token value`: total nilai token holdings selain SOL.
- `Total value`: SOL value + token value.

Kolom token:

- `MY VALUE`: estimasi modal/cost basis posisi dari nilai sekarang dan unrealized PnL.
- `MKT CAP`: market cap token dari metadata GMGN.
- `EST. RETURN`: estimasi nilai posisi sekarang jika dijual di harga saat ini.
- `REALIZED PNL`: PnL realized dalam persen.
- `UNREALIZED PNL`: PnL belum terealisasi dalam USD dan persen.

## Catatan GMGN CLI

- Project mencoba `node_modules/.bin/gmgn-cli` terlebih dahulu.
- Jika tidak ada, fallback ke `npx gmgn-cli`.
- `GMGN_API_KEY` tetap wajib.
