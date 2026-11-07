export const usd = (n: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(Math.round(n));

export const num = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

/** Days between two ISO dates (YYYY-MM-DD) without reading the clock. */
export function daysBetween(fromIso: string, toIso: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return NaN;
    return Date.UTC(y, m - 1, d);
  };
  const diff = (parse(toIso) - parse(fromIso)) / 86_400_000;
  return Number.isFinite(diff) ? Math.round(diff) : 0;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
