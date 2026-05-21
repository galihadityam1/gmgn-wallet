const {
  formatPrice,
  formatSol,
  formatUsd,
  shortAddress,
} = require("../utils/format");
const { percent } = require("../utils/number");
const { formatPlanValue } = require("../utils/trade-plan-format");

function page(title, body, { refreshSeconds = null } = {}) {
  const refresh = refreshSeconds
    ? `<meta http-equiv="refresh" content="${escapeHtml(refreshSeconds)}">`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${refresh}
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; --bg: #101214; --panel: #171b1f; --text: #edf1f5; --muted: #9aa5b1; --line: #2a3138; --green: #41c983; --yellow: #e0b64b; --red: #ff6b6b; --blue: #62a8ff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
    header { padding: 18px 22px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    h1 { font-size: 18px; margin: 0; }
    main { padding: 18px 22px 32px; }
    a { color: var(--blue); text-decoration: none; }
    .muted { color: var(--muted); }
    .bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .pill { border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; color: var(--muted); font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-weight: 600; position: sticky; top: 0; background: var(--bg); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .status { font-weight: 700; }
    .ENTRY_READY { color: var(--green); }
    .SETUP { color: var(--yellow); }
    .AVOID { color: var(--red); }
    .WATCH, .WATCH_LOW_DATA { color: var(--blue); }
    .warn { color: var(--yellow); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .panel { border: 1px solid var(--line); background: var(--panel); padding: 14px; border-radius: 8px; }
    .panel h2 { margin: 0 0 10px; font-size: 15px; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    form { display: flex; gap: 8px; flex-wrap: wrap; }
    input { min-width: 280px; padding: 8px 10px; border: 1px solid var(--line); background: var(--bg); color: var(--text); border-radius: 6px; }
    button { padding: 8px 12px; border: 1px solid var(--line); background: var(--panel); color: var(--text); border-radius: 6px; cursor: pointer; }
    .action { display: inline-block; border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; color: var(--text); background: var(--panel); font-size: 12px; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function renderHome({ result, config, storage }) {
  const rows = result.analyses
    .map((analysis, index) => renderAnalysisRow(analysis, index))
    .join("");
  const warnings = [
    !storage.enabled ? `History disabled: ${storage.reason}` : null,
    ...result.errors,
  ]
    .filter(Boolean)
    .map((warning) => `<span class="pill warn">${escapeHtml(warning)}</span>`)
    .join("");

  return page(
    "GMGN Scanner",
    `<header>
      <div>
        <h1>GMGN Conservative Intraday Scanner</h1>
        <div class="muted">Solana day-trade scanner. Manual execution only.</div>
      </div>
      <nav><a href="/wallet">Wallet</a> <span class="muted">/</span> <a href="/watchlist">Watchlist</a> <span class="muted">/</span> <a href="/history">History</a> <span class="muted">/</span> <a href="/api/scan">JSON</a></nav>
    </header>
    <main>
      <div class="bar">
        <span class="pill">mode=${escapeHtml(config.filterMode)}</span>
        <span class="pill">limit=${escapeHtml(config.scanLimit)}</span>
        <span class="pill">updated=${escapeHtml(new Date(result.scannedAt).toLocaleTimeString())}</span>
        ${warnings}
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Token</th><th>Status</th><th>Filter</th><th>Score</th><th>Liquidity</th><th>Vol 24h</th><th>Entry MC</th><th>Stop MC</th><th>Final MC</th><th>AI</th><th>Reason</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="12">No candidates found.</td></tr>`}</tbody>
      </table>
    </main>`,
    { refreshSeconds: config.refreshSeconds },
  );
}

function renderAnalysisRow(analysis, index) {
  const market = analysis.market;
  const plan = analysis.plan;
  return `<tr>
    <td>${index + 1}</td>
    <td><a href="/token/${encodeURIComponent(market.address)}">${escapeHtml(market.symbol || "UNKNOWN")}</a><br><code class="muted">${escapeHtml(shortAddress(market.address))}</code></td>
    <td class="status ${escapeHtml(analysis.status)}">${escapeHtml(analysis.status)}</td>
    <td>${escapeHtml(analysis.filterResult)}</td>
    <td>${analysis.score.total}</td>
    <td>${escapeHtml(formatUsd(market.liquidityUsd))}</td>
    <td>${escapeHtml(formatUsd(market.volume24h))}</td>
    <td>${escapeHtml(plan.available ? formatPlanValue(plan, plan.entry) : "-")}</td>
    <td>${escapeHtml(plan.available ? formatPlanValue(plan, plan.stop) : "-")}</td>
    <td>${escapeHtml(plan.available ? formatPlanValue(plan, plan.finalTarget) : "-")}</td>
    <td><a class="action" href="/token/${encodeURIComponent(market.address)}/ai">${escapeHtml(analysis.aiReview?.verdict || "Analyze")}</a></td>
    <td>${escapeHtml(analysis.shortReason)}</td>
  </tr>`;
}

function renderTokenDetail(analysis, storage) {
  const { market, safety, technical, plan, score } = analysis;
  const planHtml = plan.available
    ? `<ul>
        <li>Basis: Market Cap</li>
        <li>Reference price: ${escapeHtml(formatPrice(plan.referencePrice))}</li>
        <li>Entry area: ${escapeHtml(formatPlanValue(plan, plan.entryLow))} - ${escapeHtml(formatPlanValue(plan, plan.entryHigh))}</li>
        <li>Stop: ${escapeHtml(formatPlanValue(plan, plan.stop))} (${escapeHtml(percent(-plan.stopPct * 100))})</li>
        <li>TP1: ${escapeHtml(formatPlanValue(plan, plan.tp1))}</li>
        <li>TP2: ${escapeHtml(formatPlanValue(plan, plan.tp2))}</li>
        <li>Final: ${escapeHtml(formatPlanValue(plan, plan.finalTarget))} (${escapeHtml(plan.rewardRisk.toFixed(2))}R)</li>
        <li>Suggested size: ${escapeHtml(plan.sizeSol ? formatSol(plan.sizeSol) : "optional")}</li>
        <li>Invalidation: ${escapeHtml(plan.invalidation)}</li>
      </ul>`
    : `<p>${escapeHtml(plan.reason)}</p>`;

  return page(
    `${market.symbol || "Token"} Detail`,
    `<header>
      <div><h1>${escapeHtml(market.symbol || "UNKNOWN")} <span class="muted">${escapeHtml(shortAddress(market.address))}</span></h1><div class="muted">${escapeHtml(market.address)}</div></div>
      <nav><a class="action" href="/token/${encodeURIComponent(market.address)}/ai">AI Review</a> <span class="muted">/</span> <a href="/">Dashboard</a> <span class="muted">/</span> <a href="/api/token/${encodeURIComponent(market.address)}">JSON</a></nav>
    </header>
    <main>
      ${!storage.enabled ? `<p class="warn">History disabled: ${escapeHtml(storage.reason)}</p>` : ""}
      <div class="grid">
        <section class="panel"><h2>Status</h2><p class="status ${escapeHtml(analysis.status)}">${escapeHtml(analysis.status)}</p><p>Filter: ${escapeHtml(analysis.filterResult)}<br>Score: ${score.total}/100</p></section>
        <section class="panel"><h2>Market</h2><p>Price: ${escapeHtml(formatPrice(market.priceUsd))}<br>Liquidity: ${escapeHtml(formatUsd(market.liquidityUsd))}<br>24h Volume: ${escapeHtml(formatUsd(market.volume24h))}<br>Market Cap/FDV: ${escapeHtml(formatUsd(market.marketCap || market.fdv))}<br>Age: ${Number.isFinite(market.ageDays) ? escapeHtml(`${market.ageDays.toFixed(1)}d`) : "-"}</p></section>
        <section class="panel"><h2>Trade Plan</h2>${planHtml}</section>
        <section class="panel"><h2>Score Breakdown</h2><ul>${Object.entries(
          score.breakdown,
        )
          .map(([key, value]) => `<li>${escapeHtml(key)}: ${value}</li>`)
          .join("")}</ul></section>
        <section class="panel"><h2>Safety</h2><p>Passed: ${safety.passed ? "yes" : "no"}</p><ul>${(safety.reasons.length ? safety.reasons : ["No safety blockers found"]).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></section>
        <section class="panel"><h2>Technical</h2><p>Setup: ${technical.setup ? "yes" : "no"}<br>Trigger: ${technical.entryTrigger ? "yes" : "no"}<br>Support: ${escapeHtml(formatPrice(technical.support))}<br>Resistance: ${escapeHtml(formatPrice(technical.resistance))}<br>EMA 9/21: ${escapeHtml(formatPrice(technical.indicators?.ema?.ema9))} / ${escapeHtml(formatPrice(technical.indicators?.ema?.ema21))}<br>MA 20/50: ${escapeHtml(formatPrice(technical.indicators?.ma?.ma20))} / ${escapeHtml(formatPrice(technical.indicators?.ma?.ma50))}<br>Boll 20/2: ${escapeHtml(formatPrice(technical.indicators?.bollinger?.lower))} / ${escapeHtml(formatPrice(technical.indicators?.bollinger?.middle))} / ${escapeHtml(formatPrice(technical.indicators?.bollinger?.upper))} (${escapeHtml(technical.indicators?.bollinger?.position || "-")})<br>SAR: ${escapeHtml(formatPrice(technical.indicators?.sar?.value))} (${escapeHtml(technical.indicators?.sar?.trend || "-")})</p><ul>${[...technical.reasons, ...technical.warnings].map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></section>
      </div>
      <section class="panel" style="margin-top:14px"><h2>Reasons</h2><ul>${analysis.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></section>
      ${analysis.aiReview ? `<section class="panel" style="margin-top:14px"><h2>AI Status Explanation</h2><p>Verdict: ${escapeHtml(analysis.aiReview.verdict)}<br>Confidence adjustment: ${escapeHtml(analysis.aiReview.confidenceAdjustment)}<br>Final status: ${escapeHtml(analysis.aiReview.finalStatus || analysis.status)}</p><p>${escapeHtml(analysis.aiReview.reasoningSummary)}</p><p>${escapeHtml(analysis.aiReview.suggestedAction)}</p><ul>${[...(analysis.aiReview.riskNotes || []), ...(analysis.aiReview.missingData || []).map((item) => `Missing: ${item}`)].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
    </main>`,
  );
}

function renderWatchlist(tokens, message = "") {
  return page(
    "Watchlist",
    `<header><h1>Watchlist</h1><nav><a href="/">Dashboard</a></nav></header>
    <main>
      ${message ? `<p>${escapeHtml(message)}</p>` : ""}
      <form method="post" action="/watchlist/add">
        <input name="address" placeholder="Solana token address" required>
        <input name="note" placeholder="Note optional">
        <button type="submit">Add</button>
      </form>
      <table style="margin-top:16px"><thead><tr><th>Token</th><th>Note</th><th>Added</th><th></th></tr></thead>
      <tbody>${tokens
        .map(
          (token) => `<tr>
            <td><code>${escapeHtml(token.address)}</code></td>
            <td>${escapeHtml(token.note || "")}</td>
            <td>${escapeHtml(token.addedAt || "")}</td>
            <td><form method="post" action="/watchlist/remove"><input type="hidden" name="address" value="${escapeHtml(token.address)}"><button type="submit">Remove</button></form></td>
          </tr>`,
        )
        .join("")}</tbody></table>
    </main>`,
  );
}

function renderHistoryPage(rows, storage) {
  const body = !storage.enabled
    ? `<p class="warn">History unavailable: ${escapeHtml(storage.reason)}</p>`
    : `<table><thead><tr><th>Time</th><th>Token</th><th>Status</th><th>Filter</th><th>Score</th><th>Reason</th></tr></thead><tbody>${rows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(new Date(row.created_at).toLocaleString())}</td><td>${escapeHtml(row.symbol || "UNKNOWN")}<br><code>${escapeHtml(shortAddress(row.token_address))}</code></td><td class="status ${escapeHtml(row.status)}">${escapeHtml(row.status)}</td><td>${escapeHtml(row.filter_result)}</td><td>${row.score}</td><td>${escapeHtml(Array.isArray(row.reasons) ? row.reasons[0] || "" : "")}</td></tr>`,
        )
        .join("")}</tbody></table>`;

  return page(
    "History",
    `<header><h1>History</h1><nav><a href="/">Dashboard</a></nav></header><main>${body}</main>`,
  );
}

function renderWalletPage(result, config) {
  const body = !result.configured
    ? `<p class="warn">No wallets configured. Set <code>WALLET_ADDRESSES</code> in <code>.env</code>.</p>`
    : result.wallets
        .map(
          (wallet) => `<section class="panel" style="margin-bottom:14px">
            <h2>Wallet ${escapeHtml(shortAddress(wallet.address))}</h2>
            <p class="muted"><code>${escapeHtml(wallet.address)}</code></p>
            ${wallet.error ? `<p class="warn">Syncing with GMGN networks... checking wallet status...</p><p class="muted">${escapeHtml(wallet.error)}</p>` : renderWalletHoldingsTable(wallet)}
          </section>`,
        )
        .join("");

  return page(
    "Wallet Tracker",
    `<header>
      <div><h1>Wallet Tracker</h1><div class="muted">GMGN portfolio holdings. Manual execution only.</div></div>
      <nav><a href="/">Dashboard</a> <span class="muted">/</span> <a href="/api/wallet">JSON</a></nav>
    </header>
    <main>
      <div class="bar">
        <span class="pill">wallets=${escapeHtml(config.walletAddresses.length)}</span>
        <span class="pill">updated=${escapeHtml(new Date(result.updatedAt).toLocaleTimeString())}</span>
        <span class="pill">refresh=${escapeHtml(config.walletRefreshSeconds)}s</span>
      </div>
      ${body}
    </main>`,
    { refreshSeconds: config.walletRefreshSeconds },
  );
}

function renderWalletHoldingsTable(wallet) {
  const summary = `<p>SOL balance: ${escapeHtml(formatWebSolBalance(wallet.solBalance))}<br>Token value: ${escapeHtml(formatUsd(wallet.totalTokenValueUsd))}<br>Total value: ${escapeHtml(formatUsd(wallet.totalValueUsd))}</p>`;

  if (!wallet.holdings.length) {
    return `${summary}<p class="warn">No active token positions found in wallet.</p>`;
  }

  return `${summary}
    <table>
      <thead><tr>
        <th>#</th><th>Symbol</th><th>My Value</th><th>Est. Return</th><th>Mkt Cap</th><th>Realized PnL</th><th>Unrealized PnL</th>
      </tr></thead>
      <tbody>${wallet.holdings
        .map(
          (holding, index) => `<tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(holding.symbol || "UNKNOWN")}</td>
            <td>${escapeHtml(formatUsd(holding.valueUsd))}</td>
            <td>${escapeHtml(formatUsd(holding.estimatedReturnUsd))}</td>
            <td>${escapeHtml(formatUsd(holding.marketCapUsd))}</td>
            <td class="${pnlClass(holding.realizedPnlPct)}">${escapeHtml(formatPct(holding.realizedPnlPct))}</td>
            <td class="${walletPnlClass(holding)}">${escapeHtml(formatWalletUnrealized(holding))}</td>
          </tr>`,
        )
        .join("")}</tbody>
    </table>`;
}

function formatWebSolBalance(solBalance) {
  if (!Number.isFinite(solBalance?.sol)) return "-";
  const usd = Number.isFinite(solBalance.valueUsd)
    ? ` / ${formatUsd(solBalance.valueUsd)}`
    : "";
  return `${solBalance.sol.toFixed(4)} SOL${usd}`;
}

function formatWalletUnrealized(holding) {
  const usd = Number.isFinite(holding.unrealizedPnlUsd)
    ? formatUsd(holding.unrealizedPnlUsd)
    : "-";
  const pct = formatPct(holding.unrealizedPnlPct);
  return `${usd} / ${pct}`;
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function walletPnlClass(holding) {
  const value = Number.isFinite(holding.unrealizedPnlUsd)
    ? holding.unrealizedPnlUsd
    : holding.unrealizedPnlPct;
  if (!Number.isFinite(value)) return "";
  return value >= 0 ? "ENTRY_READY" : "AVOID";
}

function pnlClass(value) {
  if (!Number.isFinite(value)) return "";
  return value >= 0 ? "ENTRY_READY" : "AVOID";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  escapeHtml,
  renderHistoryPage,
  renderHome,
  renderTokenDetail,
  renderWalletPage,
  renderWatchlist,
};
