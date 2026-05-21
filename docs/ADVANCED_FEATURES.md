# Advanced Features

## 1. Detail Analisa Token

```bash
node bin/gmgn-scanner.js detail <token-address>
```

Output berisi:

- market data
- safety gate
- score breakdown
- technical setup
- entry area berdasarkan market cap
- stop berdasarkan market cap
- TP1, TP2, final target berdasarkan market cap
- invalidation
- optional suggested size

## 2. Watchlist Manual

Tambah token:

```bash
node bin/gmgn-scanner.js watchlist add <token-address> "catatan optional"
```

Lihat watchlist:

```bash
node bin/gmgn-scanner.js watchlist list
```

Hapus token:

```bash
node bin/gmgn-scanner.js watchlist remove <token-address>
```

Watchlist disimpan lokal di:

```text
data/watchlist.json
```

File `data/*.json` di-ignore oleh git.

## 3. History

Jika `DATABASE_URL` aktif:

```bash
node bin/gmgn-scanner.js history
```

History untuk token tertentu:

```bash
node bin/gmgn-scanner.js history <token-address>
```

Kalau Postgres belum aktif, command akan memberi tahu bahwa history disabled.
