"use client";
import type { Tip } from "./useChart";

/** Floating tooltip inside a chart container; first line is the heading. */
export default function ChartTip({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null;
  const x = Math.min(Math.max(tip.x, 80), width - 80);
  return (
    <div className="ch-tip" style={{ left: x, top: tip.y }} role="status">
      {tip.lines.map((l, i) => (i === 0 ? <strong key={i}>{l}</strong> : <span key={i}>{l}</span>))}
    </div>
  );
}
