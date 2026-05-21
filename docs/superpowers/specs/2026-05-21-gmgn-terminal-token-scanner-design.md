# GMGN Terminal Token Scanner Design

Date: 2026-05-21
Status: Approved design, implementation in progress

## Goal

Build a terminal bot for Solana token analysis on GMGN. The bot should find mature tokens with enough data for conservative intraday trading decisions. It should not buy or sell automatically in this phase.

The first version covers three workflows:

1. Scan and rank candidate tokens.
2. Alert only when a token becomes `ENTRY_READY`.
3. Provide a manual trading assistant view with entry, stop, targets, confidence, and reasoning.

Auto-trading is explicitly out of scope for this design.

## Infrastructure

The project uses Node.js with Express.js as the application runtime.

Express is responsible for:

- Serving the plain HTML web dashboard.
- Exposing JSON API endpoints for scan, token detail, history, and config.
- Handling watchlist actions from the web view.

The terminal CLI remains supported, but CLI commands and Express routes must call the same scanner service. Analysis, scoring, alerting, and trade-plan logic should live in shared backend modules, not in route handlers or terminal renderers.

The frontend should stay plain server-rendered HTML for this phase. No React, Vite, or separate frontend build pipeline is required.

## Trading Style

The bot is optimized for same-day trades. It should look for setups where a trader can enter and exit during the same trading day.

The default style is conservative:

- Prefer fewer, higher-quality signals.
- Require enough token age, liquidity, and volume before technical scoring matters.
- Avoid forcing a signal when data is missing or suspicious.
- Use a wider default stop-loss band of 7-10%, balanced by smaller optional position sizing.
- Display optional size suggestions in the 0.05-0.2 SOL range when capital settings are configured.

The bot is an analytical assistant. It should explain trade plans and risks, but the user remains responsible for manual execution.

## Data Sources

GMGN is the primary data source and requires `GMGN_API_KEY` from `.env`.

Fallback or supplemental sources are optional:

- DexScreener for pair, liquidity, price, and volume data.
- Jupiter for token price or routing-related price checks.
- Birdeye, Helius, or other providers if API keys are later added to `.env`.

The bot should normalize all provider responses into internal market data structures so the analysis logic does not depend directly on one API shape.

If GMGN fails, the bot may use fallback sources where possible. If no source provides enough data, the token should stay in a low-confidence state rather than being promoted to an entry signal.

## Candidate Discovery

The scanner starts with Solana only, but the module boundaries should allow other chains later.

Candidate tokens come from:

- GMGN token discovery for mature, active Solana tokens.
- Manual watchlist entries added by command.

The first implementation should prioritize mature tokens over newly launched or trend-only tokens.

## Filter Modes

The bot supports two initial filter modes.

`conservative`:

- Token age is at least 7 days.
- Liquidity is greater than $50,000.
- 24h volume is greater than $100,000.

`strict`:

- Token age is at least 14 days.
- Liquidity is greater than $100,000.
- 24h volume is greater than $250,000.

Tokens that fail filters can still appear in the dashboard, but they must show a clear filter result such as `LOW_LIQ`, `LOW_VOL`, `LOW_AGE`, `LOW_DATA`, or `RISK_FLAG`.

## Signal Statuses

Every candidate receives one current status:

- `AVOID`: failed safety gate, suspicious data, or poor risk/reward.
- `WATCH_LOW_DATA`: potentially interesting but not enough data for reliable analysis.
- `WATCH`: passed basic safety checks, but no actionable intraday setup yet.
- `SETUP`: structure is forming, but trigger conditions are not complete.
- `ENTRY_READY`: setup is valid, entry/stop/targets are clear, and risk/reward is acceptable.

Terminal alerts should fire only when a token enters `ENTRY_READY`. Alerts should be deduplicated so the same token does not alert repeatedly on every refresh unless its state resets and becomes ready again.

## Scoring Model

The final score is 0-100. The first version uses transparent rule-based scoring with historical tracking so the rules can be tuned later.

Initial score weights:

- Data quality: 15 points.
- Safety and liquidity: 25 points.
- Intraday structure: 30 points.
- Volume confirmation: 15 points.
- Risk/reward quality: 15 points.

Safety gate runs before technical scoring. A token with a dangerous safety result cannot become `ENTRY_READY` even if the technical score looks strong.

## Technical Analysis Rules

The signal engine should evaluate intraday structure using available data:

- Current price relative to short-term support and resistance.
- Breakout and retest behavior.
- Higher low or trend continuation structure.
- Volume confirmation during price strength.
- Liquidity depth and whether the stop can be placed realistically.
- Whether same-day exit levels are reachable without requiring an unrealistic move.

The exact implementation can start simple and deterministic, then improve as stored signal outcomes accumulate.

## Trade Plan

For `SETUP` and `ENTRY_READY` tokens, the bot should generate:

- Entry area.
- Stop-loss level using a 7-10% default band unless market structure requires a tighter invalidation.
- TP1, TP2, and final target.
- Invalidation reason.
- Confidence score and short explanation.

Targets use a hybrid model:

- Minimum reward/risk must be acceptable.
- Final target should align with technical levels such as resistance, VWAP-related levels, intraday high, or liquidity zones when available.

Position size is optional. If user capital/risk settings are configured, the bot suggests a size between 0.05 and 0.2 SOL based on confidence and stop distance. If not configured, the bot should still show the trade plan without size.

## CLI Commands

Initial commands:

- `scan`: live dashboard with refresh.
- `detail <token>`: full analysis breakdown for one token.
- `watchlist add <token>`: add manual token candidate.
- `watchlist remove <token>`: remove manual token candidate.
- `watchlist list`: show manual watchlist.
- `history`: show stored signal and snapshot history.
- `config`: show active settings and provider status without printing secret values.
- `web`: start an Express.js web view using plain HTML.

The existing `dashboard.js` is a useful starting point for terminal formatting, but the implementation should move toward a modular CLI structure instead of keeping all behavior in one file.

## Express Web View

The project should include Express.js as the HTTP layer so the scanner can grow into a richer application later. The first web version should stay simple and use plain HTML rendered by the server, not a frontend framework.

Initial routes:

- `GET /`: run a scan and render the dashboard as HTML.
- `GET /token/:address`: render the detail analysis for one token.
- `GET /watchlist`: manage manual watchlist tokens.
- `GET /history`: render stored signal history when Postgres is active.
- `GET /api/scan`: return latest scan result as JSON.
- `GET /api/token/:address`: return token detail analysis as JSON.
- `GET /api/history`: return stored history as JSON.
- `GET /api/config`: return non-secret runtime config.

The CLI, Express routes, and future workers should call the same scanner service so scoring and signal behavior stay consistent.

## Dashboard

The `scan` dashboard should refresh on an interval and show:

- Rank.
- Symbol and shortened address.
- Signal status.
- Filter result.
- Score.
- Liquidity.
- 24h volume.
- Market cap.
- Entry.
- Stop.
- TP1, TP2, and final target.
- Short reason.

The dashboard should include filter visibility so the user can see why a token is blocked, watched, or entry-ready.

## Detail View

`detail <token>` is a priority feature. It should explain:

- Data source used for each major field.
- Safety gate pass/fail results.
- Score breakdown by category.
- Technical setup reasoning.
- Entry, stop, targets, and invalidation.
- Optional size recommendation.
- Why the token is not `ENTRY_READY` if blocked.

This command should be useful for manual decision-making, not just debugging.

## Storage

Use Postgres when `DATABASE_URL` is present.

Initial tables:

- `scan_runs`: one row per scan cycle or scan session, including mode, refresh interval, duration, and error counts.
- `token_snapshots`: normalized market data per token per scan time.
- `signal_snapshots`: safety result, score, status, trade plan, and reasons per token per scan time.
- `watchlist_tokens`: manually added token addresses and metadata.
- `alert_events`: recorded `ENTRY_READY` alerts for deduplication and later review.

If `DATABASE_URL` is missing or Postgres fails, the bot should continue in live-only mode and warn that history tracking is unavailable. The `history` command should explain that Postgres is not active.

## Error Handling

The bot should degrade gracefully:

- GMGN API failure: use fallback sources when possible.
- Fallback API failure: mark missing fields and reduce data-quality score.
- Missing token age, liquidity, or volume: do not promote to `ENTRY_READY`.
- Postgres failure: continue dashboard mode without persistence.
- Rate limit: slow request cadence and show a warning.
- Malformed provider response: skip the token for that cycle and record the error if storage is available.

## Configuration

Configuration comes from `.env` and CLI defaults.

Required:

- `GMGN_API_KEY`

Optional:

- `DATABASE_URL`
- `BIRDEYE_API_KEY`
- `HELIUS_API_KEY`
- Risk settings such as max position size, default capital, max risk per trade, and filter mode.

Secret values must never be printed by `config`; only status such as `set` or `missing` should be shown.

## Testing

Initial test coverage should focus on deterministic logic:

- Safety gate decisions for mature, low-liquidity, low-volume, young, and partial-data tokens.
- Score calculation and category breakdown.
- Signal status transitions.
- Trade plan generation with 7-10% stop behavior.
- Alert deduplication for `ENTRY_READY`.
- Terminal formatting helpers.
- Postgres schema and repository functions when a test `DATABASE_URL` is available.

Fixtures should include at least:

- Mature liquid token with valid setup.
- Mature token with no entry setup.
- Low-liquidity token.
- Young token.
- Token with incomplete data.
- Token with poor risk/reward.

## Non-Goals

This phase does not include:

- Auto-buy or auto-sell.
- Wallet transaction signing.
- Copy trading.
- Trend-only ranking.
- Guaranteed profitability claims.
- Multi-chain scanning beyond keeping the architecture ready for it.

## Implementation Notes

The current implementation should use a small Node.js project structure with Express.js as the web/backend server and CLI commands as a secondary interface over the same scanner service. Keep modules focused:

- Provider adapters.
- Data normalization.
- Safety gate.
- Scoring.
- Trade plan.
- Storage.
- Express web routes.
- Plain HTML rendering.
- CLI rendering.
- Commands.

The implementation should avoid duplicating business logic between Express and the CLI. Shared behavior belongs in the scanner service and analysis modules.
