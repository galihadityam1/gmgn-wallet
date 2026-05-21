class NullStorage {
  constructor(reason = "DATABASE_URL is not set") {
    this.enabled = false;
    this.reason = reason;
  }

  async init() {}

  async close() {}

  async createScanRun() {
    return null;
  }

  async finishScanRun() {}

  async saveTokenSnapshot() {}

  async saveSignalSnapshot() {}

  async hasRecentAlert() {
    return false;
  }

  async recordAlert() {}

  async getHistory() {
    return [];
  }

  async getAiReview() {
    return null;
  }

  async saveAiReview() {}

  async getAiMemory() {
    return [];
  }

  async getOutcomeReviews() {
    return [];
  }

  async confirmOutcome() {
    return null;
  }
}

module.exports = {
  NullStorage,
};
