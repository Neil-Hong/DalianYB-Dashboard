"use client";
import { useChart, niceTicks } from "./useChart";
import ChartTip from "./ChartTip";

export interface ScatterPoint { x: number; y: number; label: string; logo?: string | null; highlight?: boolean; tip: string[] }

interface Props {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  /** larger y is worse (goals conceded): draw it downwards so "better" is up and to the right */
  invertY?: boolean;
  quadrants?: { topRight: string; bottomLeft: string };
  height?: number;
  ariaLabel: string;
}

const M = { top: 18, right: 18, bottom: 40, left: 44 };

/** Team scatter (attack vs defence) with average lines and crest markers. */
export default function ScatterChart({ points, xLabel, yLabel, invertY, quadrants, height = 340, ariaLabel }: Props) {
  const { ref, width, inView, tip, show, hide } = useChart();
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const pad = (lo: number, hi: number) => { const d = Math.max(1, (hi - lo) * 0.12); return [Math.max(0, Math.floor(lo - d)), Math.ceil(hi + d)]; };
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const pw = width - M.left - M.right, ph = height - M.top - M.bottom;
  const sx = (v: number) => M.left + ((v - x0) / (x1 - x0)) * pw;
  const sy = (v: number) => (invertY ? M.top + ((v - y0) / (y1 - y0)) * ph : M.top + ph - ((v - y0) / (y1 - y0)) * ph);
  /** ticks on round multiples of a nice step inside [lo, hi] */
  const ticksIn = (lo: number, hi: number) => {
    const step = niceTicks(hi - lo, 5)[1] || 1;
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(6));
    return out;
  };
  const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const r = width < 480 ? 9 : 12;

  return (
    <div ref={ref} className={inView ? "ch in" : "ch"} onPointerLeave={hide}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <g className="ch-grid">
          {ticksIn(x0, x1).map((v) => (
            <g key={`x${v}`}><line x1={sx(v)} x2={sx(v)} y1={M.top} y2={M.top + ph} /><text x={sx(v)} y={M.top + ph + 16} textAnchor="middle">{v}</text></g>
          ))}
          {ticksIn(y0, y1).map((v) => (
            <g key={`y${v}`}><line x1={M.left} x2={M.left + pw} y1={sy(v)} y2={sy(v)} /><text x={M.left - 8} y={sy(v)} dy=".32em" textAnchor="end">{v}</text></g>
          ))}
          <line className="ch-avg" x1={sx(avgX)} x2={sx(avgX)} y1={M.top} y2={M.top + ph} />
          <line className="ch-avg" x1={M.left} x2={M.left + pw} y1={sy(avgY)} y2={sy(avgY)} />
          <text className="ch-axis-label" x={M.left + pw} y={height - 4} textAnchor="end">{xLabel} →</text>
          <text className="ch-axis-label" x={12} y={M.top + ph / 2} textAnchor="middle" transform={`rotate(-90 12 ${M.top + ph / 2})`}>
            {invertY ? `← ${yLabel}` : `${yLabel} →`}
          </text>
          {quadrants && <>
            <text className="ch-quad" x={M.left + pw - 6} y={M.top + 12} textAnchor="end">{quadrants.topRight}</text>
            <text className="ch-quad" x={M.left + 6} y={M.top + ph - 8}>{quadrants.bottomLeft}</text>
          </>}
        </g>
        {points.map((p, i) => (
          // outer group positions the point; the inner group animates (a CSS transform would replace the translate)
          <g key={p.label} transform={`translate(${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)})`}>
            <g className={p.highlight ? "ch-pt us" : "ch-pt"} style={{ transitionDelay: `${0.2 + i * 0.04}s` }}>
              <circle r={r + (p.highlight ? 3 : 1)} className="ch-pt-bg" />
              {p.logo
                ? <image href={p.logo} x={-r * 0.8} y={-r * 0.8} width={r * 1.6} height={r * 1.6} preserveAspectRatio="xMidYMid meet" />
                : <circle r={r * 0.5} className="ch-pt-dot" />}
              {p.highlight && <text className="ch-pt-label" y={-r - 8} textAnchor="middle">{p.label}</text>}
              <circle r={r + 4} className="ch-hit" onPointerEnter={(e) => show(e, p.tip)} onPointerDown={(e) => show(e, p.tip)} />
            </g>
          </g>
        ))}
      </svg>
      <ChartTip tip={tip} width={width} />
    </div>
  );
}
