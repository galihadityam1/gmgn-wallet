# Documentation Summary

Ringkasan cepat dari semua dokumentasi GMGN Terminal Scanner.

## SETUP.md - Setup Platform

**Mac:** Install Node.js, Ollama (opsional), PostgreSQL (opsional via Homebrew)
**Windows:** Install Node.js, Ollama (opsional), PostgreSQL (opsional), setup environment variables, Git
**Linux:** Install Node.js via NodeSource, Ollama (opsional), PostgreSQL via apt

## GETTING_STARTED.md - Mulai Menggunakan

1. `npm install` - Install dependency
2. Siapkan `.env` - `GMGN_API_KEY` wajib, lainnya opsional
3. `node bin/gmgn-scanner.js config` - Cek konfigurasi
4. **Jika AI enabled:** `ollama run qwen3:8b` - Jalankan Ollama model
5. `npm run scan:once --limit 2` - Smoke test
6. `npm run scan` - Jalankan scanner live (Ctrl+C untuk stop)

**Key env variables:**
- `GMGN_API_KEY` - Wajib
- `DATABASE_URL` - Opsional, untuk history
- `AI_ENABLED=true` - Aktifkan AI risk critic
- `WALLET_ADDRESSES` - Multi-wallet tracking

## GETTING_DONE.md - Matikan Services

**PENTING untuk hemat RAM:**
1. `Ctrl+C` - Stop scanner/web
2. Matikan Ollama: `brew services stop ollama` (Mac) atau Task Manager (Windows)
3. Matikan PostgreSQL jika tidak perlu: `brew services stop postgresql@14` (Mac)
4. Kill model yang sedang berjalan: `pkill -f ollama` (Mac/Linux)

**Ollama model memakan 4-8GB RAM - selalu matikan setelah selesai**

## WEB_INTERFACE.md - Web Dashboard

- `npm run web` - Jalankan di http://localhost:3000
- `npm run web --port 3001` - Gunakan port lain jika 3000 busy
- `/` - Dashboard scanner dengan cache/background scan
- `/wallet` - Multi-wallet tracker
- `/token/:address` - Detail analisa token
- `/token/:address/ai` - Detail dengan AI explanation
- `/watchlist` - Kelola watchlist manual
- `/history` - History jika Postgres aktif

**Performa:** Dashboard memakai cache, AI hanya saat tombol `Analyze` diklik

## ADVANCED_FEATURES.md - Fitur Lanjutan

- `node bin/gmgn-scanner.js detail <address>` - Detail analisa token
- `node bin/gmgn-scanner.js watchlist add <address> "catatan"` - Tambah watchlist
- `node bin/gmgn-scanner.js watchlist list` - Lihat watchlist
- `node bin/gmgn-scanner.js history` - History scan (butuh Postgres)
- `node bin/gmgn-scanner.js history <address>` - History token tertentu

## TECHNICAL_DETAILS.md - Teknis

- `npm test` - Run test suite
- Indikator teknikal: EMA 9/21, MA 20/50, Bollinger Bands, Parabolic SAR
- Entry/Stop/Target berdasarkan market cap, bukan harga langsung

## AI_INTEGRATION.md - AI Risk Critic

**Setup:**
- `ollama pull qwen3:8b` - Pull model
- `ollama pull nomic-embed-text` - Pull embed model
- Set `AI_ENABLED=true` di `.env`

**Usage:**
- AI hanya review token `ENTRY_READY`
- AI bisa menurunkan confidence atau blok entry
- `node bin/gmgn-scanner.js ai critic <address>` - Manual AI review
- Tombol `Analyze` di web dashboard - AI explanation per token

**Outcome review:**
- `node bin/gmgn-scanner.js outcome review` - Lihat outcomes
- `node bin/gmgn-scanner.js outcome confirm <id> <result> "notes"` - Konfirmasi outcome

## QUICK_REFERENCE.md - Shortcut NPM

```bash
npm run scan          # Scanner live
npm run scan:once     # Scan sekali
npm run wallet        # Wallet tracker live
npm run wallet:once   # Wallet tracker sekali
npm run web           # Web dashboard
npm run config        # Cek konfigurasi
npm test              # Run test
```

## TROUBLESHOOTING.md - Troubleshooting

**Port busy:** `npm run web --port 3001`
**GMGN fail:** Cek `GMGN_API_KEY` di `.env`, test dengan `npm run scan:once --limit 2`
**History disabled:** Tambah `DATABASE_URL` ke `.env`
**AI slow:** Gunakan `qwen3:8b`, set `AI_REVIEW_CONCURRENCY=1`, naikkan `AI_TIMEOUT_MS`

## DAILY_WORKFLOW.md - Workflow Harian

1. `npm run config` - Cek config
2. `npm run scan:once --limit 2` - Smoke test
3. `npm run web --port 3001` - Jalankan web
4. Buka http://localhost:3001
5. Analisa kandidat menarik

## WALLET_TRACKER.md - Wallet Tracker

**Setup:**
- `WALLET_ADDRESSES=wallet1,wallet2,wallet3` di `.env`
- `WALLET_REFRESH_SECONDS=2` - Interval refresh

**Usage:**
- `npm run wallet` - Terminal mode (lebih ringan)
- `npm run wallet:once` - Single scan
- `/wallet` di web - Browser mode

**Kolom:** MY VALUE, MKT CAP, EST. RETURN, REALIZED PNL, UNREALIZED PNL (USD + %)

## Quick Start Checklist

- [ ] Install Node.js
- [ ] `npm install`
- [ ] Setup `.env` dengan `GMGN_API_KEY`
- [ ] Jika pakai AI: `ollama pull qwen3:8b` dan `ollama run qwen3:8b`
- [ ] `npm run config` - Verify setup
- [ ] `npm run scan:once --limit 2` - Test
- [ ] `npm run scan` atau `npm run web` - Mulai

## Quick Stop Checklist

- [ ] `Ctrl+C` di terminal scanner/web
- [ ] Matikan Ollama: `brew services stop ollama` / Task Manager
- [ ] Kill model: `pkill -f ollama` / Task Manager
- [ ] Matikan PostgreSQL jika tidak perlu
