# Technical Details

## 1. Test

```bash
npm test
```

Test saat ini mencakup:

- AI review schema dan guardrail AI
- safety gate
- scoring/status signal
- position sizing
- sorting signal
- CLI arg parsing
- HTML escaping

## 2. Parameter Teknikal

Scanner memakai indikator pendukung berikut dari data kline/candle:

- `EMA 9` dan `EMA 21`: mendeteksi momentum/trend pendek. Sinyal positif jika EMA 9 di atas EMA 21 dan harga masih di atas EMA 9.
- `MA 20` dan `MA 50`: filter trend yang lebih lambat. Sinyal positif jika MA 20 di atas MA 50 dan harga di atas MA 20.
- `Bollinger Bands 20/2`: membaca posisi harga terhadap band. Upper-half mendukung momentum, above-upper diberi warning agar tidak mengejar harga tanpa retest, below-lower dianggap momentum lemah.
- `Parabolic SAR 0.02/0.2`: konfirmasi arah trend. SAR bullish menambah skor, SAR bearish menjadi warning.

Indikator ini adalah data pendukung, bukan satu-satunya syarat entry. Safety/liquidity/data gate, volume confirmation, dan risk/reward tetap dipakai.

## 3. Entry, Stop, Dan Target

Trade plan memakai `market_cap` atau `fdv` sebagai basis utama, bukan harga token langsung.

Yang ditampilkan:

- `Entry MC`: area market cap untuk entry.
- `Stop MC`: market cap invalidation.
- `TP MC`: target market cap.
- `Reference price`: harga token saat analisa, hanya sebagai referensi.

Persentase risk/reward tetap sama secara matematis, tetapi output level dibuat dalam market cap agar lebih cocok untuk membaca token Solana/meme yang supply dan decimal-nya sering membuat harga token kurang intuitif.
