# Getting Done

Setelah selesai menggunakan scanner, penting untuk mematikan semua services agar tidak membebani sistem dan menghemat RAM.

## Matikan Scanner dan Web View

Tekan `Ctrl+C` di terminal tempat scanner dan web view berjalan.

## Matikan Ollama (PENTING - Hemat RAM)

Ollama dapat memakan RAM yang signifikan saat model aktif. Matikan setelah selesai:

### Mac/Linux

```bash
# Cek proses Ollama yang berjalan
ps aux | grep ollama

# Matikan Ollama service
brew services stop ollama

# Atau kill proses secara manual
pkill -f ollama
```

### Windows

**Via Task Manager:**

1. Tekan `Ctrl + Shift + Esc`
2. Cari proses `ollama`
3. Klik kanan → End Task

**Via Command Prompt:**

```cmd
taskkill /IM ollama.exe /F
```

### Mematikan Model yang Sedang Berjalan

Jika Ollama sedang menjalankan model (misalnya setelah `ollama run qwen3:8b`), model tersebut tetap akan memakan RAM meskipun service dimatikan. Pastikan untuk:

1. Tekan `Ctrl+C` di terminal tempat model berjalan
2. Atau gunakan command:
   ```bash
   # Mac/Linux
   pkill -f "ollama run"
   ```

## Matikan PostgreSQL (Opsional)

Jika tidak menggunakan history atau database, PostgreSQL bisa dimatikan untuk menghemat resources.

### Mac (Homebrew)

```bash
brew services stop postgresql@14
```

### Linux (systemd)

```bash
sudo systemctl stop postgresql
```

### Windows

Buka Services:

- Tekan `Win + R`, ketik `services.msc`
- Cari `postgresql-x64-14`
- Klik kanan → Stop

Atau via Command Prompt (Run as Administrator):

```cmd
net stop postgresql-x64-14
```

## Shutdown Cepat (Semua Services)

### Mac/Linux

```bash
# 1. Stop scanner/web (Ctrl+C di terminal)
# 2. Matikan Ollama dan model
brew services stop ollama
pkill -f ollama
# 3. Matikan PostgreSQL (opsional)
brew services stop postgresql@14
```

### Windows

1. Stop scanner/web (Ctrl+C di terminal)
2. Buka Task Manager → End task `ollama.exe`
3. Buka Services → Stop `postgresql-x64-14` (opsional)

## Verifikasi Semua Services Dimatikan

### Cek RAM Usage

**Mac:**

```bash
top -o MEM
```

**Linux:**

```bash
htop
# atau
free -h
```

**Windows:**

- Buka Task Manager → tab Performance

### Cek Proses yang Masih Berjalan

**Mac/Linux:**

```bash
ps aux | grep -E "(node|ollama|postgres)"
```

**Windows:**

```cmd
tasklist | findstr /I "node ollama postgres"
```

## Tips Hemat RAM

- **Matikan Ollama setelah selesai** - Model seperti `qwen3:8b` bisa memakan 4-8GB RAM
- **Matikan PostgreSQL jika tidak perlu** - Dapat menghemat ~100-200MB RAM
- **Gunakan model yang lebih kecil** - `qwen3:8b` lebih ringan dari `qwen3:14b`
- **Matikan web view jika hanya pakai terminal** - Express server juga memakan RAM
- **Limit AI concurrency** - Pastikan `AI_REVIEW_CONCURRENCY=1` di `.env`

## Restart Kembali

Jika ingin menggunakan scanner lagi, ikuti urutan di [GETTING_STARTED.md](./GETTING_STARTED.md) dan jangan lupa:

1. Jalankan Ollama jika pakai AI:

   ```bash
   ollama run qwen3:8b
   ```

   Ollama otomatis akan:
   - Start service kalau belum hidup
   - Load model ke RAM/VRAM
   - Buka chat terminal

2. Jika cuma mau preload tanpa masuk chat:

   ```bash
   ollama run qwen3:8b ""
   ```

3. Cek apakah sudah aktif:

   ```bash
   ollama ps
   ```

4. Kalau dipakai dari app/API lain, cukup start server Ollama:

   ```bash
   ollama serve
   ```

   Lalu app lain bisa akses ke: `http://localhost:11434`

5. Jalankan scanner/web seperti biasa
