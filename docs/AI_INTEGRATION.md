# AI Integration

## Local AI Risk Critic

AI lokal memakai Ollama. Install Ollama dari:

```text
https://ollama.com
```

Setelah Ollama berjalan, pull model:

```bash
ollama pull qwen3:8b
ollama pull nomic-embed-text
```

Opsional untuk Mac M1 Pro 32GB:

```bash
ollama pull qwen3:14b
```

Aktifkan di `.env`:

```bash
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=qwen3:8b
AI_EMBED_MODEL=nomic-embed-text
AI_TIMEOUT_MS=60000
AI_REVIEW_ENTRY_READY=true
AI_REVIEW_CONCURRENCY=1
```

Cara kerja:

- Rule engine tetap menentukan status awal.
- AI otomatis hanya mereview `ENTRY_READY`.
- AI boleh menurunkan confidence atau memblok entry.
- AI tidak boleh menaikkan `WATCH`, `SETUP`, atau `AVOID` menjadi `ENTRY_READY`.
- Jika Ollama offline, scanner tetap berjalan dan menampilkan warning.

Command AI:

```bash
node bin/gmgn-scanner.js ai critic <token-address>
node bin/gmgn-scanner.js ai explain <token-address>
node bin/gmgn-scanner.js ai journal
```

Di web dashboard, setiap row token punya tombol `Analyze` pada kolom AI. Tombol ini membuka `/token/:address/ai` dan meminta AI menjelaskan kenapa token masuk status rule engine saat ini, lalu memberi risk note dan missing data.

Dashboard web memakai cache/background scan agar halaman tidak menunggu GMGN dan AI terlalu lama. AI tidak otomatis berjalan saat halaman dashboard refresh; AI hanya dipanggil saat tombol `Analyze` diklik.

Outcome review:

```bash
node bin/gmgn-scanner.js outcome review
node bin/gmgn-scanner.js outcome confirm <id> <result> "notes optional"
```

Result outcome yang didukung:

- `TP_HIT`
- `SL_HIT`
- `NO_ENTRY`
- `EXPIRED`
- `UNCLEAR`
- `WIN`
- `LOSS`
- `BREAKEVEN`
- `SKIPPED`
