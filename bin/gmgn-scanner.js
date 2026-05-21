#!/usr/bin/env node

const { runCli } = require("../src/cli");

runCli(process.argv.slice(2)).catch((err) => {
  console.error(`Fatal: ${err.message}`);
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exitCode = 1;
});
