# Platform Setup

Pilih platform yang kamu gunakan:

## Mac (macOS)

### 1. Install Node.js

Download dan install dari:

```text
https://nodejs.org
```

Pastikan install versi LTS (recommended).

### 2. Install Ollama (Opsional - untuk AI)

Download dan install dari:

```text
https://ollama.com
```

### 3. Install PostgreSQL (Opsional - untuk history)

Gunakan Homebrew:

```bash
brew install postgresql@14
brew services start postgresql@14
```

Atau download dari:

```text
https://www.postgresql.org/download/macosx/
```

## Windows

### 1. Install Node.js

Download dan install dari:

```text
https://nodejs.org
```

Pilih versi LTS dan ikuti installer Windows.

### 2. Install Ollama (Opsional - untuk AI)

Download dan install dari:

```text
https://ollama.com
```

Setelah install, Ollama akan berjalan sebagai Windows service.

### 3. Install PostgreSQL (Opsional - untuk history)

Download dan install dari:

```text
https://www.postgresql.org/download/windows/
```

Pilih versi yang sesuai dengan Windows kamu (32-bit atau 64-bit).

### 4. Setup Environment Variables (Windows)

Buka System Properties:

- Tekan `Win + X`, pilih "System"
- Klik "Advanced system settings"
- Klik "Environment Variables"
- Di "User variables", tambahkan:
  - Variable: `NODE_ENV`
  - Value: `development`

### 5. Install Git (Jika belum ada)

Download dan install dari:

```text
https://git-scm.com/download/win
```

## Linux (Ubuntu/Debian)

### 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Ollama (Opsional - untuk AI)

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 3. Install PostgreSQL (Opsional - untuk history)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```
