// Language-neutral formatting. Dates and UI text live in src/i18n.

export function fmtValue(eur: number | null | undefined) {
  if (!eur) return "—";
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(eur % 1_000_000 ? 1 : 0)}M`;
  return `€${Math.round(eur / 1000)}K`;
}

export const dash = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
