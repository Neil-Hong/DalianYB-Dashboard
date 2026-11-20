// HTML/CSS bar charts. They're simple enough that plain elements read better than SVG, and they
// reflow naturally on small screens.
import { cx, vars } from "../../lib/cx";
import AnimateIn from "./AnimateIn";

export interface ButterflyRow { label: string; left: number; right: number; fmt?: (v: number) => string; max?: number }

/** Two-sided comparison (e.g. home ← → away) with the metric name in the middle. */
export function Butterfly({ rows, leftTitle, rightTitle }: { rows: ButterflyRow[]; leftTitle: string; rightTitle: string }) {
  return (
    <AnimateIn className="bf">
      <div className="bf-head"><span>{leftTitle}</span><span>{rightTitle}</span></div>
      {rows.map((r, i) => {
        const max = r.max ?? Math.max(r.left, r.right, 0.0001);
        const f = r.fmt ?? String;
        return (
          <div key={r.label} className="bf-row" style={vars({ "--i": i })}>
            <span className={cx("bf-val", { lead: r.left > r.right })}>{f(r.left)}</span>
            <span className="bf-track left"><i style={vars({ "--v": r.left / max })} /></span>
            <span className="bf-label">{r.label}</span>
            <span className="bf-track right"><i style={vars({ "--v": r.right / max })} /></span>
            <span className={cx("bf-val", { lead: r.right > r.left })}>{f(r.right)}</span>
          </div>
        );
      })}
    </AnimateIn>
  );
}

export interface HBarRow { key: string; label: string; value: number; display?: string; note?: string; logo?: string | null; highlight?: boolean }

/** Ranked horizontal bars (e.g. league points). */
export function HBars({ rows, max }: { rows: HBarRow[]; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <AnimateIn className="hb">
      {rows.map((r, i) => (
        <div key={r.key} className={cx("hb-row", { us: r.highlight })} style={vars({ "--i": i })}>
          <span className="hb-label">{r.logo && <img src={r.logo} alt="" width={20} height={20} loading="lazy" />}<span>{r.label}</span></span>
          <span className="hb-track"><i style={vars({ "--v": r.value / top })} /></span>
          <span className="hb-val">{r.display ?? r.value}{r.note && <small>{r.note}</small>}</span>
        </div>
      ))}
    </AnimateIn>
  );
}

export interface GroupMetric { label: string; values: { key: string; value: number; display: string; current?: boolean }[]; max?: number }

/** One block per metric, one bar per season (season comparison). */
export function GroupedBars({ metrics }: { metrics: GroupMetric[] }) {
  return (
    <AnimateIn className="gb">
      {metrics.map((m, mi) => {
        const top = m.max ?? Math.max(...m.values.map((v) => v.value), 0.0001);
        return (
          <div key={m.label} className="gb-metric">
            <h3>{m.label}</h3>
            {m.values.map((v, i) => (
              <div key={v.key} className={cx("gb-row", { current: v.current })} style={vars({ "--i": mi * 3 + i })}>
                <span className="gb-key">{v.key}</span>
                <span className="gb-track"><i style={vars({ "--v": v.value / top })} /></span>
                <span className="gb-val">{v.display}</span>
              </div>
            ))}
          </div>
        );
      })}
    </AnimateIn>
  );
}
