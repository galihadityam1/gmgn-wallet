# GMGN Terminal Scanner

A conservative intraday Solana token scanner and terminal trading assistant with local AI risk critic.

## Features

- **Token Scanning**: Rule-based scanner with safety gates and technical indicators (EMA, MA, Bollinger Bands, Parabolic SAR)
- **Local AI Risk Critic**: Optional Ollama-powered AI analysis for entry-ready tokens (runs locally, no API keys needed)
- **Multi-Wallet Tracker**: Monitor Solana wallet holdings across multiple addresses with real-time PnL tracking
- **Web Dashboard**: Express-based web interface with cached background scanning for performance
- **Entry/Stop/Target Recommendations**: Market cap-based trade plans instead of raw prices
- **Watchlist Management**: Manual token watchlist with notes
- **History Tracking**: Optional PostgreSQL integration for scan history and outcome review

## Quick Start

```bash
# Install dependencies
npm install

# Configure .env (GMGN_API_KEY required)
cp .env.example .env
# Edit .env with your GMGN API key

# Run scanner
npm run scan

# Run web dashboard
npm run web
# Open http://localhost:3000
```

## Documentation

- [SUMMARY.md](docs/SUMMARY.md) - Quick reference overview
- [SETUP.md](docs/SETUP.md) - Platform setup (Mac/Windows/Linux)
- [GETTING_STARTED.md](docs/GETTING_STARTED.md) - Full getting started guide
- [GETTING_DONE.md](docs/GETTING_DONE.md) - How to properly shutdown services
- [WEB_INTERFACE.md](docs/WEB_INTERFACE.md) - Web dashboard documentation
- [AI_INTEGRATION.md](docs/AI_INTEGRATION.md) - Local AI setup and usage
- [WALLET_TRACKER.md](docs/WALLET_TRACKER.md) - Multi-wallet tracking

## Requirements

- Node.js >= 20
- GMGN API key
- Optional: Ollama (for AI features)
- Optional: PostgreSQL (for history tracking)

## Commands

```bash
npm run scan          # Run live terminal scanner
npm run scan:once     # Single scan
npm run wallet        # Multi-wallet tracker (live)
npm run wallet:once   # Wallet tracker (single scan)
npm run web           # Web dashboard
npm run config        # Check configuration
npm test              # Run tests
```

## Architecture

- Rule-based filtering with safety gates
- Market cap-based trade planning (not raw prices)
- Technical indicators for trend confirmation
- Local AI for risk assessment (Ollama + qwen3:8b)
- Cached background scanning for responsive web UI
- Multi-platform support (Mac, Windows, Linux)

## License

Private
