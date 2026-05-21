const { NullStorage } = require("./null-storage");
const { PostgresStorage } = require("./postgres");

async function createStorage(config) {
  if (!config.databaseUrl) {
    return new NullStorage("DATABASE_URL is not set");
  }

  let pg;
  try {
    pg = require("pg");
  } catch (_) {
    return new NullStorage("Optional dependency pg is not installed");
  }

  const storage = new PostgresStorage(config, pg);
  try {
    await storage.init();
    return storage;
  } catch (err) {
    const detail = err.message || err.code || err.name || "connection failed";
    return new NullStorage(`Postgres unavailable: ${detail}`);
  }
}

module.exports = {
  createStorage,
};
