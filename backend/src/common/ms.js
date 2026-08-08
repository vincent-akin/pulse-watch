// Minimal duration parser for strings like "15m", "30d", "1h", "45s" → milliseconds.
const UNITS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

module.exports = function ms(input) {
  if (typeof input === 'number') return input;
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(String(input).trim());
  if (!match) throw new Error(`Invalid duration string: ${input}`);
  return parseInt(match[1], 10) * UNITS[match[2]];
};
