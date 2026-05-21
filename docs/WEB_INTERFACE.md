# Web Interface

## 1. Jalankan Web View Express

Default:

```bash
npm run web
```

Atau:

```bash
node bin/gmgn-scanner.js web
```

Buka:

```text
http://localhost:3000
```

Kalau port `3000` sedang dipakai, gunakan port lain:

```bash
node bin/gmgn-scanner.js web --port 3001
```

Buka:

```text
http://localhost:3001
```

Catatan performa:

- Dashboard `/` memakai cache/background scan.
- Dashboard memakai mode data cepat. Detail token dan tombol `Analyze` tetap mengambil data lengkap saat dibuka.
- Jika GMGN lambat saat initial load, halaman tetap merespons dengan pesan loading dan akan refresh otomatis.
- AI tidak otomatis berjalan saat dashboard refresh. Gunakan tombol `Analyze` di row token untuk memanggil AI per token.

## 2. Web Routes

Halaman HTML:

- `/` dashboard scanner
- `/wallet` tracker holdings multi-wallet
- `/token/:address` detail analisa token
- `/token/:address/ai` detail token dengan AI status explanation
- `/watchlist` kelola watchlist manual
- `/history` lihat history jika Postgres aktif

JSON API:

- `/api/scan`
- `/api/token/:address`
- `/api/wallet`
- `/api/history`
- `/api/config`
- `/api/ai/critic/:address`
- `/api/outcomes`
- `POST /api/outcomes/:id/confirm`
