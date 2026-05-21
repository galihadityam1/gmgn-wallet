# Local AI Risk Critic Design

Date: 2026-05-21
Status: Approved design, pending implementation

## Goal

Add a local AI layer to the GMGN scanner so the bot can reason about risk, explain setups, and learn from trading journal history while still running locally on terminal and Express.

The AI layer should make the bot feel more analytical, but it must not become an uncontrolled auto-trading agent.

## Runtime Choice

Default runtime: Ollama.

Default model:

- `qwen3:8b` for baseline local use on Mac and Windows laptops.
- `qwen3:14b` as an optional upgrade for Mac M1 Pro 32GB if performance is acceptable.

Embedding model:

- `nomic-embed-text`, reserved for future memory/RAG upgrades.

Fallback runtimes are not part of the first implementation, but the AI provider should be isolated behind an adapter so LM Studio or llama.cpp can be added later.

## Target Devices

Primary device:

- MacBook M1 Pro, 32GB RAM, 1TB storage.

Compatibility target:

- Windows laptop with at least 16GB RAM.

The default model and AI workflow must be conservative enough for the Windows 16GB target. AI should not run across every scanned token by default.

## Configuration

Add `.env` settings:

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

Manual model setup:

```bash
ollama pull qwen3:8b
ollama pull nomic-embed-text
```

Optional model upgrades:

```bash
ollama pull qwen3:14b
```

## Dependencies

Add Node dependencies:

```bash
npm install ollama zod zod-to-json-schema
```

`ollama` provides the local model client.

`zod` validates AI output.

`zod-to-json-schema` generates the structured output schema passed to Ollama.

## AI Role

The AI acts as a Risk Critic.

It may:

- Explain a token status.
- Add risk notes.
- Identify missing data.
- Lower confidence.
- Block or downgrade an `ENTRY_READY` signal.
- Summarize lessons from signal history.

It may not:

- Raise `AVOID`, `WATCH_LOW_DATA`, `WATCH`, or `SETUP` to `ENTRY_READY`.
- Override safety gate risk flags.
- Recommend auto-buy or auto-sell.
- Execute trades.
- Make decisions outside the validated JSON schema.

## AI Review Modes

Automatic:

- Run AI critic only for `ENTRY_READY` tokens.
- Cache the review for a signal so refresh cycles do not repeatedly call the model.

On-demand:

- Allow AI review for other tokens through CLI and web actions.

Disabled:

- If `AI_ENABLED=false`, the scanner remains fully rule-based.

Unavailable:

- If Ollama is offline, times out, or returns invalid JSON, the scanner continues with rule-engine results and records an `AI_UNAVAILABLE` warning.

## Structured Output

AI responses must be valid JSON matching a schema similar to:

```json
{
  "verdict": "PASS",
  "confidenceAdjustment": -10,
  "riskNotes": ["Liquidity is adequate but volume quality is mixed"],
  "missingData": ["No holder concentration data"],
  "reasoningSummary": "The setup is technically valid, but confirmation is not perfect.",
  "suggestedAction": "Wait for retest before manual entry"
}
```

Allowed verdicts:

- `PASS`
- `CAUTION`
- `BLOCK`

`confidenceAdjustment` must be less than or equal to zero for automatic critic mode. The AI cannot increase confidence in that mode.

## Status Integration

Rule engine status remains primary.

Status handling:

- `ENTRY_READY + AI PASS`: remains `ENTRY_READY`.
- `ENTRY_READY + AI CAUTION`: remains `ENTRY_READY`, but confidence is reduced and risk notes are shown.
- `ENTRY_READY + AI BLOCK`: downgraded to `SETUP` or `WATCH`.
- Non-entry statuses cannot be upgraded by AI.

The final displayed status should make AI involvement visible, for example with an AI verdict or risk note column in detail views.

## Prompt Inputs

The AI critic receives compact, structured context:

- Token identity: symbol and address.
- Rule-engine status and score.
- Safety gate result and reasons.
- Filter result.
- Market cap based trade plan: entry MC, stop MC, TP MC, reward/risk.
- Market data: liquidity, 24h volume, market cap or FDV, age, source status.
- Technical indicators: EMA, MA, Bollinger Bands, Parabolic SAR, VWAP, support/resistance.
- Volume confirmation.
- Relevant journal memory from Postgres.

The prompt must explicitly state the guardrails and require JSON only.

## Postgres Memory

Use Postgres for phase-one AI memory. Do not add a separate vector database yet.

Additional tables:

- `ai_reviews`: AI critic result per signal.
- `signal_outcomes`: semi-automatic outcome suggestions and user confirmation.
- `daily_journals`: daily summaries and lessons learned.
- `ai_memory_notes`: compact reusable notes for future prompts.

The memory sent to AI must be small and relevant. It should be selected by token, status, filter result, setup similarity, and recent history.

## Outcome Review

Outcome tracking is semi-automatic.

Flow:

1. Store signal and AI review.
2. After a review window such as two hours, four hours, or end-of-day, fetch current market cap.
3. Suggest an outcome.
4. User confirms or edits the outcome.
5. Journal memory uses confirmed or suggested outcomes in future AI context.

Outcome values:

- `TP_HIT`
- `SL_HIT`
- `NO_ENTRY`
- `EXPIRED`
- `UNCLEAR`
- `WIN`
- `LOSS`
- `BREAKEVEN`
- `SKIPPED`

## Commands

Add CLI commands:

- `ai explain <token>`: explain current rule status and risk.
- `ai critic <token>`: run risk critic for a token.
- `ai journal`: summarize recent signals and lessons.
- `outcome review`: list outcome suggestions needing confirmation.
- `outcome confirm <id> <result>`: confirm or edit a suggested outcome.

Web view additions:

- Show AI verdict and risk notes in token detail.
- Add simple outcome review page.
- Add JSON endpoints for AI review and outcome confirmation.

## Performance Rules

Default behavior:

- AI concurrency is `1`.
- Timeout is `60s`.
- Automatic AI review only runs for `ENTRY_READY`.
- AI review results are cached per token/signal.

The scan loop must stay usable when AI is slow. If AI is unavailable, scanner output should still render.

## Security And Safety

The AI receives only market and journal context needed for analysis. It should not receive API keys or raw `.env` values.

The AI cannot execute shell commands, sign transactions, or place trades.

The AI is not a profitability guarantee. It is a local risk reviewer layered on top of deterministic rules.

## Testing

Add tests for:

- AI schema validation.
- Invalid JSON handling.
- Timeout handling.
- Guardrail that AI cannot upgrade statuses to `ENTRY_READY`.
- `AI BLOCK` downgrading `ENTRY_READY`.
- `AI CAUTION` reducing confidence but keeping status.
- AI disabled mode.
- Postgres repository functions for AI tables when a test database is available.

Tests should mock the Ollama client. Unit tests must not require a local model to be running.

## Documentation

Update docs with:

- Ollama install notes for Mac and Windows.
- Model pull commands.
- `.env` AI settings.
- How to run scanner with AI enabled.
- How to use `ai explain`, `ai critic`, and `ai journal`.
- How to review outcomes.
- Explanation of AI guardrails.

## References

- https://docs.ollama.com/capabilities/structured-outputs
- https://docs.ollama.com/capabilities/tool-calling
- https://ollama.com/library/qwen3
- https://ai.google.dev/gemma/docs/core
- https://lmstudio.ai/docs/developer/core/server
- https://github.com/ggml-org/llama.cpp
- https://help.openai.com/en/articles/11870455-openai-open-weight-models-gpt-oss
