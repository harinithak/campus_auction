export function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function fromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

export function assertCents(cents, label = "amount") {
  if (!Number.isInteger(cents) || cents < 0) {
    const err = new Error(`${label} must be a non-negative integer (cents)`);
    err.status = 400;
    throw err;
  }
}
