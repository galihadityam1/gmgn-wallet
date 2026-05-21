# Daily Workflow

## Urutan Recommended Harian

1. Jalankan config check:

```bash
node bin/gmgn-scanner.js config
```

2. Smoke test scan:

```bash
node bin/gmgn-scanner.js scan --once --limit 2
```

3. Jalankan web view:

```bash
node bin/gmgn-scanner.js web --port 3001
```

4. Buka dashboard:

```text
http://localhost:3001
```

5. Saat ada kandidat menarik, buka detail:

```bash
node bin/gmgn-scanner.js detail <token-address>
```

atau klik token dari web dashboard.
