const { analyzeToken } = require("./analysis/signal-engine");
const { applyAiReviewToAnalysis } = require("./ai/risk-critic");

class ScannerService {
  constructor({ config, marketData, storage, aiCritic = null }) {
    this.config = config;
    this.marketData = marketData;
    this.storage = storage;
    this.aiCritic = aiCritic;
    this.memoryAlerts = new Map();
  }

  async scan(options = {}) {
    const limit = Number(options.limit || this.config.scanLimit);
    const fullGmgn = options.fullGmgn !== false;
    const errors = [];
    const scanRunId = await this.storage.createScanRun({
      mode: this.config.filterMode,
      refreshSeconds: this.config.refreshSeconds,
      limit,
    });

    try {
      const discovered = await this.marketData.discoverCandidates({ limit });
      errors.push(...discovered.errors);

      const markets = await this.marketData.enrichCandidates(discovered.candidates, {
        fullGmgn,
      });

      const baseAnalyses = markets
        .map((market) => analyzeToken(market, this.config))
        .sort(sortAnalyses);
      const analyses = options.aiReviews === false
        ? baseAnalyses
        : await this.applyAutomaticAiReviews(baseAnalyses, errors);

      await this.persistResults(scanRunId, analyses, errors);
      const alerts = await this.collectAlerts(analyses);
      await this.storage.finishScanRun(scanRunId, { errors });

      return {
        analyses,
        alerts,
        errors,
        scanRunId,
        scannedAt: new Date().toISOString(),
      };
    } catch (err) {
      errors.push(err.message);
      await this.storage.finishScanRun(scanRunId, { errors });
      throw err;
    }
  }

  async detail(address) {
    const market = await this.marketData.getTokenMarketData(address);
    const analysis = analyzeToken(market, this.config);
    await this.storage.saveTokenSnapshot(null, analysis.market);
    await this.storage.saveSignalSnapshot(null, analysis);
    return analysis;
  }

  async aiReview(address, options = {}) {
    const analysis = await this.detail(address);
    if (!this.aiCritic) return analysis;
    const review = await this.aiCritic.reviewAnalysis(analysis, {
      mode: options.mode || "on_demand",
      force: options.force !== false,
    });
    return applyAiReviewToAnalysis(analysis, review);
  }

  async applyAutomaticAiReviews(analyses, errors) {
    if (!this.aiCritic || !this.config.ai.enabled || !this.config.ai.reviewEntryReady) {
      return analyses;
    }

    const next = [];
    for (const analysis of analyses) {
      if (analysis.status !== "ENTRY_READY") {
        next.push(analysis);
        continue;
      }

      const review = await this.aiCritic.reviewAnalysis(analysis, {
        mode: "automatic",
      });

      if (review?.unavailable) {
        errors.push(`AI review unavailable for ${analysis.market.symbol}: ${review.reasoningSummary}`);
        next.push({ ...analysis, aiReview: review });
      } else {
        next.push(applyAiReviewToAnalysis(analysis, review));
      }
    }

    return next.sort(sortAnalyses);
  }

  async persistResults(scanRunId, analyses, errors) {
    for (const analysis of analyses) {
      try {
        await this.storage.saveTokenSnapshot(scanRunId, analysis.market);
        await this.storage.saveSignalSnapshot(scanRunId, analysis);
      } catch (err) {
        errors.push(`Storage write failed for ${analysis.market.address}: ${err.message}`);
      }
    }
  }

  async collectAlerts(analyses) {
    const alerts = [];
    for (const analysis of analyses) {
      if (analysis.status !== "ENTRY_READY") continue;

      const alreadyAlerted =
        (await this.storage.hasRecentAlert(analysis.market.address)) ||
        this.hasMemoryAlert(analysis.market.address);

      if (alreadyAlerted) continue;

      alerts.push(analysis);
      this.markMemoryAlert(analysis.market.address);
      await this.storage.recordAlert(analysis);
    }
    return alerts;
  }

  hasMemoryAlert(address) {
    const last = this.memoryAlerts.get(address);
    if (!last) return false;
    return Date.now() - last < 4 * 60 * 60 * 1000;
  }

  markMemoryAlert(address) {
    this.memoryAlerts.set(address, Date.now());
  }
}

function sortAnalyses(a, b) {
  const statusRank = {
    ENTRY_READY: 4,
    SETUP: 3,
    WATCH: 2,
    WATCH_LOW_DATA: 1,
    AVOID: 0,
  };
  const statusDiff = (statusRank[b.status] || 0) - (statusRank[a.status] || 0);
  if (statusDiff) return statusDiff;
  return b.score.total - a.score.total;
}

module.exports = {
  ScannerService,
  sortAnalyses,
};
