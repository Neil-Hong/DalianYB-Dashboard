/** Join class names, skipping falsy entries; objects map class -> condition. */
export function cx(...parts: (string | false | null | undefined | Record<string, unknown>)[]): string {
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (typeof p === "string") out.push(p);
    else for (const [k, on] of Object.entries(p)) if (on) out.push(k);
  }
  return out.join(" ");
}

/** Inline CSS custom properties, e.g. vars({ "--i": 2 }). */
export const vars = (o: Record<string, string | number>) => o as React.CSSProperties;
