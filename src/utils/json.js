function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, "");
}

function parsePossiblyNoisyJson(output) {
  const clean = stripAnsi(output).trim();
  if (!clean) return null;

  try {
    return JSON.parse(clean);
  } catch (_) {
    // Continue below.
  }

  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch (_) {
      // Continue searching for the last JSON-looking line.
    }
  }

  const objectStart = clean.indexOf("{");
  const arrayStart = clean.indexOf("[");
  const start =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);

  if (start >= 0) {
    const candidate = clean.slice(start);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Fall through.
    }
  }

  throw new Error("Unable to parse JSON output");
}

module.exports = {
  parsePossiblyNoisyJson,
  stripAnsi,
};
