const express = require("express");
const { readWatchlist, addWatchlistToken, removeWatchlistToken } = require("../data/watchlist");
const {
  renderHistoryPage,
  renderHome,
  renderTokenDetail,
  renderWalletPage,
  renderWatchlist,
} = require("./html");

function createServer(appContext) {
  const app = express();
  const scanCache = createScanCache(appContext);
  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: "256kb" }));

  app.get("/", async (_req, res, next) => {
    try {
      const result = await scanCache.get();
      res.type("html").send(renderHome({ result, config: appContext.config, storage: appContext.storage }));
    } catch (err) {
      next(err);
    }
  });

  app.get("/token/:address", async (req, res, next) => {
    try {
      const analysis = await appContext.scanner.detail(req.params.address);
      res.type("html").send(renderTokenDetail(analysis, appContext.storage));
    } catch (err) {
      next(err);
    }
  });

  app.get("/token/:address/ai", async (req, res, next) => {
    try {
      const analysis = await appContext.scanner.aiReview(req.params.address, { mode: "web_explain" });
      res.type("html").send(renderTokenDetail(analysis, appContext.storage));
    } catch (err) {
      next(err);
    }
  });

  app.get("/watchlist", (req, res) => {
    res.type("html").send(renderWatchlist(readWatchlist(appContext.config), req.query.message || ""));
  });

  app.post("/watchlist/add", (req, res, next) => {
    try {
      const result = addWatchlistToken(appContext.config, req.body.address, req.body.note || "");
      res.redirect(`/watchlist?message=${encodeURIComponent(result.added ? "Token added" : "Token already exists")}`);
    } catch (err) {
      next(err);
    }
  });

  app.post("/watchlist/remove", (req, res, next) => {
    try {
      const result = removeWatchlistToken(appContext.config, req.body.address);
      res.redirect(`/watchlist?message=${encodeURIComponent(result.removed ? "Token removed" : "Token not found")}`);
    } catch (err) {
      next(err);
    }
  });

  app.get("/history", async (_req, res, next) => {
    try {
      const rows = await appContext.storage.getHistory({ limit: 50 });
      res.type("html").send(renderHistoryPage(rows, appContext.storage));
    } catch (err) {
      next(err);
    }
  });

  app.get("/wallet", async (_req, res, next) => {
    try {
      const result = await appContext.walletTracker.getHoldings();
      res.type("html").send(renderWalletPage(result, appContext.config));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/scan", async (_req, res, next) => {
    try {
      res.json(await scanCache.get({ waitMs: 15_000 }));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/token/:address", async (req, res, next) => {
    try {
      res.json(await appContext.scanner.detail(req.params.address));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/ai/critic/:address", async (req, res, next) => {
    try {
      res.json(await appContext.scanner.aiReview(req.params.address, { mode: "web" }));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/history", async (_req, res, next) => {
    try {
      res.json({
        enabled: appContext.storage.enabled,
        reason: appContext.storage.reason || null,
        rows: await appContext.storage.getHistory({ limit: 50 }),
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/wallet", async (_req, res, next) => {
    try {
      res.json(await appContext.walletTracker.getHoldings());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/outcomes", async (_req, res, next) => {
    try {
      res.json({
        enabled: appContext.storage.enabled,
        reason: appContext.storage.reason || null,
        rows: await appContext.storage.getOutcomeReviews({ limit: 50 }),
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/outcomes/:id/confirm", async (req, res, next) => {
    try {
      const row = await appContext.storage.confirmOutcome(
        req.params.id,
        req.body.result,
        req.body.notes || "",
      );
      res.json({ row });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      chain: appContext.config.chain,
      filterMode: appContext.config.filterMode,
      filters: appContext.config.filters,
      refreshSeconds: appContext.config.refreshSeconds,
      walletRefreshSeconds: appContext.config.walletRefreshSeconds,
      scanLimit: appContext.config.scanLimit,
      envStatus: appContext.config.envStatus,
      storage: {
        enabled: appContext.storage.enabled,
        reason: appContext.storage.reason || null,
      },
    });
  });

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status);
    res.format({
      html: () => res.send(`<h1>Error</h1><pre>${escapeText(err.message)}</pre>`),
      json: () => res.json({ error: err.message }),
      default: () => res.type("txt").send(err.message),
    });
  });

  return app;
}

function createScanCache(appContext) {
  let result = null;
  let inFlight = null;
  let updatedAt = 0;
  const staleMs = Math.max(10, appContext.config.refreshSeconds) * 1000;

  async function runScan() {
    return appContext.scanner.scan({ aiReviews: false, fullGmgn: false });
  }

  function start() {
    if (!inFlight) {
      inFlight = runScan()
        .then((nextResult) => {
          result = nextResult;
          updatedAt = Date.now();
          return nextResult;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  }

  return {
    async get({ waitMs = 3_000 } = {}) {
      const isFresh = result && Date.now() - updatedAt < staleMs;
      if (isFresh) return result;

      const pending = start();
      if (result) return result;

      try {
        return await withTimeout(pending, waitMs);
      } catch (err) {
        return {
          analyses: [],
          alerts: [],
          errors: [`Initial scan is still loading: ${err.message}`],
          scanRunId: null,
          scannedAt: new Date().toISOString(),
        };
      }
    },
  };
}

function withTimeout(promise, timeoutMs) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("GMGN scan did not finish yet")), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function escapeText(value) {
  return String(value ?? "").replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char]);
}

async function startServer(appContext) {
  const app = createServer(appContext);
  const port = appContext.config.port;
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve({ app, server, port });
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use. Run with --port <free-port>.`));
      } else {
        reject(err);
      }
    });
  });
}

module.exports = {
  createServer,
  startServer,
};
