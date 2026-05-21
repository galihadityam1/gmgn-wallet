# Troubleshooting & Maintenance

## 1. Troubleshooting

### Port sudah dipakai

Error:

```text
Port 3000 is already in use
```

Solusi:

```bash
node bin/gmgn-scanner.js web --port 3001
```

### GMGN gagal fetch

Pastikan:

- `GMGN_API_KEY` ada di `.env`
- koneksi internet aktif
- GMGN CLI bisa diakses lewat `npx gmgn-cli`

Smoke test:

```bash
node bin/gmgn-scanner.js scan --once --limit 2
```

### History disabled

Jika muncul:

```text
history disabled: DATABASE_URL is not set
```

Berarti scanner tetap jalan, tapi snapshot dan signal tidak disimpan ke Postgres.

Tambahkan `DATABASE_URL` ke `.env` jika ingin mengaktifkan history.

### Postgres unavailable

Pastikan:

- `DATABASE_URL` benar
- database dapat diakses dari mesin lokal
- user database punya permission membuat tabel

Schema akan dibuat otomatis saat app start.

### Ollama / AI unavailable

Pastikan Ollama berjalan:

```bash
ollama list
```

Pastikan model sudah ada:

```bash
ollama pull qwen3:8b
```

Jika AI terlalu lambat:

- gunakan `qwen3:8b`
- pastikan `AI_REVIEW_CONCURRENCY=1`
- naikkan `AI_TIMEOUT_MS`
- set `AI_ENABLED=false` untuk kembali ke rule-based mode

## 2. Cara Mematikan Services

### Stop Scanner Terminal

Tekan:

```bash
Ctrl+C
```

### Stop Web View

Tekan:

```bash
Ctrl+C
```

### Stop PostgreSQL (Mac/Linux)

Jika menggunakan Homebrew (Mac):

```bash
brew services stop postgresql@14
```

Jika menggunakan systemd (Linux):

```bash
sudo systemctl stop postgresql
```

### Stop PostgreSQL (Windows)

Buka Services:

- Tekan `Win + R`, ketik `services.msc`
- Cari `postgresql-x64-14` (versi mungkin berbeda)
- Klik kanan → Stop

Atau via Command Prompt (Run as Administrator):

```cmd
net stop postgresql-x64-14
```

### Stop Ollama (Mac/Linux)

```bash
# Stop Ollama service
brew services stop ollama
# atau
sudo systemctl stop ollama
```

### Stop Ollama (Windows)

Buka Task Manager:

- Tekan `Ctrl + Shift + Esc`
- Cari `ollama`
- Klik kanan → End Task

Atau via Command Prompt:

```cmd
taskkill /IM ollama.exe /F
```

### Stop Semua Sekaligus (Mac/Linux)

```bash
# Stop scanner/web (Ctrl+C di terminal)
# Lalu jalankan:
brew services stop postgresql@14
brew services stop ollama
```

### Stop Semua Sekaligus (Windows)

1. Stop scanner/web (Ctrl+C di terminal)
2. Buka Task Manager → End task `ollama.exe`
3. Buka Services → Stop `postgresql-x64-14`
