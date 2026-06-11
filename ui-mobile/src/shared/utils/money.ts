// Format a numeric amount to match the symbol/style of an already-formatted
// backend `display` string (e.g. "$3.60"). Used when the client aggregates
// several MoneyAmount values (e.g. bucketing daily breakdowns) and needs a
// consistent display without a full i18n currency formatter.
export function formatMoneyLike(amount: number, sample: string): string {
  const symbolMatch = sample.match(/^[^\d.,-]+/);
  const symbol = symbolMatch ? symbolMatch[0] : "";
  const trailingMatch = sample.match(/[^\d.,\s-]+$/);
  const trailing = !symbol && trailingMatch ? trailingMatch[0] : "";
  const fixed = Math.abs(amount).toFixed(2);
  const sign = amount < 0 ? "-" : "";
  if (trailing) return `${sign}${fixed}${trailing}`;
  return `${sign}${symbol}${fixed}`;
}
