const ANSI_RE = /\x1b\[[0-9;]*m/g;

function visibleLength(value) {
  return String(value).replace(ANSI_RE, "").length;
}

function pad(value, width, align = "right") {
  const text = String(value ?? "-");
  const diff = width - visibleLength(text);
  if (diff <= 0) return text;
  return align === "left" ? text + " ".repeat(diff) : " ".repeat(diff) + text;
}

function truncate(value, width) {
  const text = String(value ?? "-");
  if (visibleLength(text) <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function formatUsd(value) {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1) return `$${value.toFixed(4)}`;
  if (value >= 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toPrecision(4)}`;
}

function formatSol(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(3)} SOL`;
}

function shortAddress(address) {
  if (!address) return "-";
  const text = String(address);
  if (text.length <= 12) return text;
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

const colors = {
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

module.exports = {
  colors,
  formatPrice,
  formatSol,
  formatUsd,
  pad,
  shortAddress,
  truncate,
  visibleLength,
};
