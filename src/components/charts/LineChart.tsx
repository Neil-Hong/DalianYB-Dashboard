"use client";
import { useChart, niceTicks, labelStep } from "./useChart";
import ChartTip from "./ChartTip";

export type Tone = "gold" | "navy" | "muted" | "sky";

export interface LinePoint { x: number; y: number; tip?: string[]; result?: "W" | "D" | "L" }
export interface LineSeries { key: string; tone: Tone; points: LinePoint[]; dashed?: boolean; area?: boolean; markers?: boolean }

interface Props {
  series: LineSeries[];
  height?: number;
  yMax?: number;
  /** fixed y ticks, e.g. [0, 1, 2, 3] for points per game */
  yTicks?: number[];
  xLabel?: string;
  yFormat?: "int" | "dec";
  ariaLabel: string;
}

const M = { top: 14, right: 14, bottom: 40, left: 36 };

/** Multi-series line chart (e.g. points race, rolling form). */
export default function LineChart({ series, height = 280, yMax, yTicks, xLabel, yFormat = "int", ariaLabel }: Props) {
  const { ref, width, inView, tip, show, hide } = useChart();
  const all = series.flatMap((s) => s.points);
  const xMin = Math.min(...all.map((p) => p.x));
  const xMax = Math.max(...all.map((p) => p.x));
  const ticks = yTicks ?? niceTicks(yMax ?? Math.max(...all.map((p) => p.y)), 5);
  const top = ticks[ticks.length - 1];
  const pw = width - M.left - M.right;
  const ph = height - M.top - M.bottom;
  const sx = (x: number) => M.left + (xMax === xMin ? pw / 2 : ((x - xMin) / (xMax - xMin)) * pw);
  const sy = (y: number) => M.top + ph - (y / top) * ph;
  const step = labelStep(xMax - xMin + 1, pw);
  const xs: number[] = [];
  for (let x = xMin; x <= xMax; x += step) xs.push(x);
  const fmt = (v: number) => (yFormat === "dec" ? v.toFixed(1) : String(v));

  return (
    <div ref={ref} className={inView ? "ch in" : "ch"} onPointerLeave={hide}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <defs>
          {series.filter((s) => s.area).map((s) => (
            <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={`ch-stop-${s.tone}`} stopOpacity=".32" />
              <stop offset="1" className={`ch-stop-${s.tone}`} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <g className="ch-grid">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={sy(v)} y2={sy(v)} />
              <text x={M.left - 8} y={sy(v)} dy=".32em" textAnchor="end">{fmt(v)}</text>
            </g>
          ))}
          {xs.map((x) => <text key={x} x={sx(x)} y={height - M.bottom + 18} textAnchor="middle">{x}</text>)}
          {xLabel && <text className="ch-axis-label" x={width - M.right} y={height - 2} textAnchor="end">{xLabel}</text>}
        </g>

        {series.map((s) => {
          const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
          const area = s.area && s.points.length
            ? `${d}L${sx(s.points[s.points.length - 1].x).toFixed(1)},${sy(0)}L${sx(s.points[0].x).toFixed(1)},${sy(0)}Z`
            : null;
          return (
            <g key={s.key} className={`ch-series ch-${s.tone}`}>
              {area && <path className="ch-area" d={area} fill={`url(#area-${s.key})`} />}
              {/* pathLength=1 drives the draw-in; dashed comparison lines fade in instead (it would rescale the dashes) */}
              <path className={s.dashed ? "ch-line dashed" : "ch-line"} d={d} pathLength={s.dashed ? undefined : 1} />
              {s.markers && s.points.map((p, i) => (
                <circle key={i} className={`ch-dot ch-r-${p.result ?? "none"}`} cx={sx(p.x)} cy={sy(p.y)} r={3.6}
                  style={{ transitionDelay: `${0.5 + (i / s.points.length) * 0.9}s` }} />
              ))}
            </g>
          );
        })}

        {/* hover targets: the primary series' points */}
        {series.filter((s) => s.markers).map((s) => s.points.map((p, i) => p.tip && (
          <circle key={`${s.key}-${i}`} className="ch-hit" cx={sx(p.x)} cy={sy(p.y)} r={Math.max(8, Math.min(14, pw / s.points.length / 2))}
            onPointerEnter={(e) => show(e, p.tip!)} onPointerDown={(e) => show(e, p.tip!)} />
        )))}
      </svg>
      <ChartTip tip={tip} width={width} />
    </div>
  );
}
