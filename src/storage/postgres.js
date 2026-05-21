class PostgresStorage {
  constructor(config, pgModule) {
    this.enabled = true;
    this.config = config;
    this.pg = pgModule;
    this.pool = new pgModule.Pool({
      connectionString: config.databaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  async init() {
    await this.pool.query(`
      create table if not exists scan_runs (
        id bigserial primary key,
        started_at timestamptz not null default now(),
        finished_at timestamptz,
        mode text not null,
        refresh_seconds integer,
        limit_count integer,
        error_count integer not null default 0,
        errors jsonb not null default '[]'::jsonb
      );

      create table if not exists token_snapshots (
        id bigserial primary key,
        scan_run_id bigint references scan_runs(id) on delete set null,
        token_address text not null,
        symbol text,
        price_usd numeric,
        liquidity_usd numeric,
        volume_24h numeric,
        market_cap numeric,
        age_days numeric,
        source jsonb not null default '{}'::jsonb,
        raw jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create table if not exists signal_snapshots (
        id bigserial primary key,
        scan_run_id bigint references scan_runs(id) on delete set null,
        token_address text not null,
        symbol text,
        status text not null,
        filter_result text not null,
        score integer not null,
        score_breakdown jsonb not null,
        reasons jsonb not null,
        trade_plan jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create table if not exists watchlist_tokens (
        token_address text primary key,
        note text,
        created_at timestamptz not null default now()
      );

      create table if not exists alert_events (
        id bigserial primary key,
        token_address text not null,
        symbol text,
        status text not null,
        score integer not null,
        reason text,
        created_at timestamptz not null default now()
      );

      create table if not exists ai_reviews (
        id bigserial primary key,
        token_address text not null,
        symbol text,
        mode text not null,
        original_status text not null,
        final_status text not null,
        rule_score integer not null,
        verdict text not null,
        confidence_adjustment integer not null,
        risk_notes jsonb not null default '[]'::jsonb,
        missing_data jsonb not null default '[]'::jsonb,
        reasoning_summary text not null,
        suggested_action text not null,
        raw jsonb not null,
        created_at timestamptz not null default now()
      );

      create table if not exists signal_outcomes (
        id bigserial primary key,
        token_address text not null,
        symbol text,
        signal_snapshot_id bigint references signal_snapshots(id) on delete set null,
        suggested_outcome text not null,
        confirmed_outcome text,
        basis text not null default 'market_cap',
        entry_value numeric,
        stop_value numeric,
        final_target_value numeric,
        observed_value numeric,
        notes text,
        suggested_at timestamptz not null default now(),
        confirmed_at timestamptz
      );

      create table if not exists daily_journals (
        id bigserial primary key,
        journal_date date not null unique,
        summary text not null,
        lessons jsonb not null default '[]'::jsonb,
        created_at timestamptz not null default now()
      );

      create table if not exists ai_memory_notes (
        id bigserial primary key,
        token_address text,
        symbol text,
        category text not null,
        note text not null,
        source text,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_token_snapshots_address_created
        on token_snapshots (token_address, created_at desc);

      create index if not exists idx_signal_snapshots_address_created
        on signal_snapshots (token_address, created_at desc);

      create index if not exists idx_alert_events_address_created
        on alert_events (token_address, created_at desc);

      create index if not exists idx_ai_reviews_address_created
        on ai_reviews (token_address, created_at desc);

      create index if not exists idx_signal_outcomes_address
        on signal_outcomes (token_address, suggested_at desc);
    `);
  }

  async close() {
    await this.pool.end();
  }

  async createScanRun({ mode, refreshSeconds, limit }) {
    const result = await this.pool.query(
      `insert into scan_runs (mode, refresh_seconds, limit_count)
       values ($1, $2, $3)
       returning id`,
      [mode, refreshSeconds, limit],
    );
    return result.rows[0].id;
  }

  async finishScanRun(id, { errors = [] } = {}) {
    if (!id) return;
    await this.pool.query(
      `update scan_runs
       set finished_at = now(), error_count = $2, errors = $3::jsonb
       where id = $1`,
      [id, errors.length, JSON.stringify(errors)],
    );
  }

  async saveTokenSnapshot(scanRunId, market) {
    await this.pool.query(
      `insert into token_snapshots (
        scan_run_id, token_address, symbol, price_usd, liquidity_usd,
        volume_24h, market_cap, age_days, source, raw
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)`,
      [
        scanRunId,
        market.address,
        market.symbol,
        market.priceUsd,
        market.liquidityUsd,
        market.volume24h,
        market.marketCap || market.fdv,
        market.ageDays,
        JSON.stringify(market.sources || {}),
        JSON.stringify(trimRaw(market.raw || {})),
      ],
    );
  }

  async saveSignalSnapshot(scanRunId, analysis) {
    await this.pool.query(
      `insert into signal_snapshots (
        scan_run_id, token_address, symbol, status, filter_result, score,
        score_breakdown, reasons, trade_plan
      ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)`,
      [
        scanRunId,
        analysis.market.address,
        analysis.market.symbol,
        analysis.status,
        analysis.filterResult,
        analysis.score.total,
        JSON.stringify(analysis.score.breakdown),
        JSON.stringify(analysis.reasons),
        JSON.stringify(analysis.plan),
      ],
    );
  }

  async hasRecentAlert(tokenAddress, minutes = 240) {
    const result = await this.pool.query(
      `select 1
       from alert_events
       where token_address = $1
         and status = 'ENTRY_READY'
         and created_at > now() - ($2::text || ' minutes')::interval
       limit 1`,
      [tokenAddress, String(minutes)],
    );
    return result.rowCount > 0;
  }

  async recordAlert(analysis) {
    await this.pool.query(
      `insert into alert_events (token_address, symbol, status, score, reason)
       values ($1,$2,$3,$4,$5)`,
      [
        analysis.market.address,
        analysis.market.symbol,
        analysis.status,
        analysis.score.total,
        analysis.shortReason,
      ],
    );
  }

  async getHistory({ limit = 20, tokenAddress = null } = {}) {
    const params = [];
    let where = "";
    if (tokenAddress) {
      params.push(tokenAddress);
      where = `where token_address = $${params.length}`;
    }
    params.push(limit);

    const result = await this.pool.query(
      `select token_address, symbol, status, filter_result, score, reasons, trade_plan, created_at
       from signal_snapshots
       ${where}
       order by created_at desc
       limit $${params.length}`,
      params,
    );

    return result.rows;
  }

  async getAiReview(analysis) {
    const result = await this.pool.query(
      `select *
       from ai_reviews
       where token_address = $1
         and original_status = $2
         and rule_score = $3
         and created_at > now() - interval '4 hours'
       order by created_at desc
       limit 1`,
      [analysis.market.address, analysis.status, analysis.score.total],
    );

    if (!result.rows[0]) return null;
    return rowToAiReview(result.rows[0]);
  }

  async saveAiReview(analysis, review, { mode = "automatic" } = {}) {
    await this.pool.query(
      `insert into ai_reviews (
        token_address, symbol, mode, original_status, final_status, rule_score,
        verdict, confidence_adjustment, risk_notes, missing_data,
        reasoning_summary, suggested_action, raw
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13::jsonb)`,
      [
        analysis.market.address,
        analysis.market.symbol,
        mode,
        review.originalStatus || analysis.status,
        review.finalStatus || analysis.status,
        analysis.score.total,
        review.verdict,
        review.confidenceAdjustment,
        JSON.stringify(review.riskNotes || []),
        JSON.stringify(review.missingData || []),
        review.reasoningSummary,
        review.suggestedAction,
        JSON.stringify(review),
      ],
    );
  }

  async getAiMemory(analysis, { limit = 5 } = {}) {
    const result = await this.pool.query(
      `select category, note, source, created_at
       from ai_memory_notes
       where token_address is null or token_address = $1 or symbol = $2
       order by created_at desc
       limit $3`,
      [analysis.market.address, analysis.market.symbol, limit],
    );
    return result.rows;
  }

  async getOutcomeReviews({ limit = 20 } = {}) {
    const result = await this.pool.query(
      `select *
       from signal_outcomes
       where confirmed_outcome is null
       order by suggested_at desc
       limit $1`,
      [limit],
    );
    return result.rows;
  }

  async confirmOutcome(id, outcome, notes = "") {
    const result = await this.pool.query(
      `update signal_outcomes
       set confirmed_outcome = $2, notes = $3, confirmed_at = now()
       where id = $1
       returning *`,
      [id, outcome, notes],
    );
    return result.rows[0] || null;
  }
}

function rowToAiReview(row) {
  return {
    verdict: row.verdict,
    confidenceAdjustment: Number(row.confidence_adjustment),
    riskNotes: row.risk_notes || [],
    missingData: row.missing_data || [],
    reasoningSummary: row.reasoning_summary,
    suggestedAction: row.suggested_action,
    originalStatus: row.original_status,
    finalStatus: row.final_status,
    blocked: row.verdict === "BLOCK",
    unavailable: false,
    reviewedAt: row.created_at,
  };
}

function trimRaw(raw) {
  const json = JSON.stringify(raw);
  if (json.length <= 50_000) return raw;
  return { truncated: true };
}

module.exports = {
  PostgresStorage,
};
