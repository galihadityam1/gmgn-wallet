# Getting Started

## 1. Install Dependency

Jalankan dari root project:

```bash
npm install
```

## 2. Siapkan `.env`

Project membaca konfigurasi dari file `.env`.

Minimal wajib:

```bash
GMGN_API_KEY=isi_api_key_gmgn
```

Opsional:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
BIRDEYE_API_KEY=
HELIUS_API_KEY=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
FILTER_MODE=conservative
REFRESH_SECONDS=45
SCAN_LIMIT=30
PORT=3000
MIN_POSITION_SOL=0.05
MAX_POSITION_SOL=0.2
DEFAULT_CAPITAL_SOL=
MAX_RISK_PER_TRADE_SOL=
WALLET_ADDRESSES=5FMHJSu4GT7FLBELnFQxRykmiYWiEuUD45k1eb67NebJ
WALLET_REFRESH_SECONDS=2

AI_ENABLED=false
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=qwen3:8b
AI_EMBED_MODEL=nomic-embed-text
AI_TIMEOUT_MS=60000
AI_REVIEW_ENTRY_READY=true
AI_REVIEW_CONCURRENCY=1
```

Catatan:

- `GMGN_API_KEY` wajib untuk GMGN.
- `DATABASE_URL` opsional. Kalau belum ada, scanner tetap jalan, tapi history tidak tersimpan.
- `FILTER_MODE` bisa `conservative` atau `strict`.
- Jangan commit `.env`.

### Dari Mana Mendapatkan Value `.env`

`GMGN_API_KEY`:

- Dari akun/API access GMGN yang kamu pakai untuk `gmgn-cli`.
- Ini wajib untuk source utama GMGN.

`DATABASE_URL`:

- Dari Postgres lokal atau provider Postgres yang kamu pakai.
- Format umum: `postgresql://user:password@localhost:5432/gmgn`.
- Opsional, tapi dibutuhkan untuk history, AI journal, dan outcome review.

`BIRDEYE_API_KEY`:

- Dari dashboard Birdeye kalau nanti kamu ingin data tambahan dari Birdeye.
- Opsional.

`HELIUS_API_KEY`:

- Dari dashboard Helius kalau nanti kamu ingin data Solana tambahan.
- Opsional.

`SOLANA_RPC_URL`:

- RPC Solana untuk membaca saldo SOL wallet.
- Default publik: `https://api.mainnet-beta.solana.com`.
- Bisa diganti ke Helius/QuickNode/Triton RPC kalau public RPC lambat atau rate limited.

`WALLET_ADDRESSES`:

- Isi dengan wallet Solana yang ingin dipantau.
- Bisa multi-wallet dengan koma: `wallet1,wallet2,wallet3`.
- Default contoh project memakai wallet kamu: `5FMHJSu4GT7FLBELnFQxRykmiYWiEuUD45k1eb67NebJ`.

`WALLET_REFRESH_SECONDS`:

- Interval refresh wallet tracker.
- Default `2`, mengikuti script monitor wallet sebelumnya.

`AI_ENABLED`:

- Isi `true` untuk mengaktifkan AI risk critic.
- Isi `false` kalau ingin scanner tetap rule-based saja.

`AI_PROVIDER`:

- Pakai `ollama` untuk fase ini.

`OLLAMA_BASE_URL`:

- Default Ollama lokal: `http://localhost:11434`.
- Value ini tersedia otomatis setelah aplikasi Ollama/ollama server berjalan di local machine.

`AI_MODEL`:

- Default recommended: `qwen3:8b`.
- Untuk Mac M1 Pro 32GB bisa coba `qwen3:14b`.
- Model harus sudah di-pull dengan `ollama pull`.

`AI_EMBED_MODEL`:

- Default: `nomic-embed-text`.
- Disiapkan untuk memory/RAG lanjutan.

`AI_TIMEOUT_MS`:

- Default `60000`.
- Naikkan kalau model lokal lambat.

`AI_REVIEW_ENTRY_READY`:

- Default `true`.
- Jika true, AI otomatis mereview token `ENTRY_READY`.

`AI_REVIEW_CONCURRENCY`:

- Default `1`.
- Biarkan `1` untuk laptop agar tidak berat.

## 3. Cek Konfigurasi

```bash
node bin/gmgn-scanner.js config
```

Command ini hanya menampilkan status secret sebagai `set` atau `missing`, bukan value API key.

## 4. Jalankan Ollama (Jika AI Enabled)

Jika kamu mengaktifkan AI di `.env` (`AI_ENABLED=true`), jalankan Ollama dan model sebelum memulai scanner:

```bash
# Jalankan Ollama dengan model yang dipilih
ollama run qwen3:8b
```

Terminal ini akan tetap terbuka dengan model yang aktif. Jangan tutup terminal ini selama menggunakan AI.

**Catatan penting:**

- Model yang berjalan akan memakan RAM (4-8GB untuk qwen3:8b)
- Setelah selesai, matikan Ollama untuk menghemat RAM (lihat [GETTING_DONE.md](./GETTING_DONE.md))
- Jika AI disabled (`AI_ENABLED=false`), langkah ini bisa dilewati

## 5. Jalankan Scan Sekali

Untuk smoke test cepat:

```bash
node bin/gmgn-scanner.js scan --once --limit 2
```

Kalau berhasil, terminal akan menampilkan tabel kandidat token dengan status seperti:

- `AVOID`
- `WATCH_LOW_DATA`
- `WATCH`
- `SETUP`
- `ENTRY_READY`

Alert hanya muncul saat token masuk `ENTRY_READY`.

## 6. Jalankan Live Terminal Scanner

```bash
npm run scan
```

Atau:

```bash
node bin/gmgn-scanner.js scan
```

Scanner akan refresh sesuai `REFRESH_SECONDS`.

Stop dengan:

```bash
Ctrl+C
```
