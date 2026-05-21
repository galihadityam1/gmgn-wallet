const test = require("node:test");
const assert = require("node:assert/strict");

const { parseArgs } = require("../src/cli");
const { escapeHtml } = require("../src/web/html");

test("parseArgs parses web port option", () => {
  const parsed = parseArgs(["web", "--port", "4000"]);
  assert.equal(parsed.command, "web");
  assert.equal(parsed.options.port, "4000");
});

test("HTML escaping protects rendered token content", () => {
  assert.equal(escapeHtml('<script>"x"</script>'), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
});
