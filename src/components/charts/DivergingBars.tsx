"use client";
import { useChart, niceTicks, labelStep } from "./useChart";
import ChartTip from "./ChartTip";

export interface DivBar { label: string; up: number; down: number; tip: string[]; result?: "W" | "D" | "L" }

interface Props { bars: DivBar[]; height?: number; ariaLabel: string }

const M = { top: 12, right: 12, bottom: 28, left: 30 };

/** Goals scored (up, gold) and conceded (down) per match around a zero line. */
export default function DivergingBars({ bars, height = 260, ariaLabel }: Props) {
  const { ref, width, inView, tip, show, hide } = useChart();
  const max = Math.max(1, ...bars.map((b) => Math.max(b.up, b.down)));
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const pw = width - M.left - M.right;
  const ph = height - M.top - M.bottom;
  const zero = M.top + ph / 2;
  const half = ph / 2;
  const band = pw / Math.max(1, bars.length);
  const bw = Math.max(3, Math.min(18, band * 0.62));
  const step = labelStep(bars.length, pw, 26);
  const h = (v: number) => (v / top) * half;

  return (
    <div ref={ref} className={inView ? "ch in" : "ch"} onPointerLeave={hide}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <g className="ch-grid">
          {ticks.filter((v) => v > 0).map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={zero - h(v)} y2={zero - h(v)} />
              <line x1={M.left} x2={width - M.right} y1={zero + h(v)} y2={zero + h(v)} />
              <text x={M.left - 8} y={zero - h(v)} dy=".32em" textAnchor="end">{v}</text>
              <text x={M.left - 8} y={zero + h(v)} dy=".32em" textAnchor="end">{v}</text>
            </g>
          ))}
          <line className="ch-zero" x1={M.left} x2={width - M.right} y1={zero} y2={zero} />
          {bars.map((b, i) => (i % step === 0 ? (
            <text key={i} x={M.left + band * (i + 0.5)} y={height - 8} textAnchor="middle">{b.label}</text>
          ) : null))}
        </g>
        {bars.map((b, i) => {
          const cx = M.left + band * (i + 0.5);
          const delay = { transitionDelay: `${(i / bars.length) * 0.8}s` };
          return (
            <g key={i}>
              {b.up > 0 && <rect className="ch-bar up" x={cx - bw / 2} y={zero - h(b.up)} width={bw} height={h(b.up)} rx={Math.min(3, bw / 3)} style={delay} />}
              {b.down > 0 && <rect className="ch-bar down" x={cx - bw / 2} y={zero} width={bw} height={h(b.down)} rx={Math.min(3, bw / 3)} style={delay} />}
              {b.result && <circle className={`ch-tick ch-r-${b.result}`} cx={cx} cy={zero} r={Math.min(3, bw / 3)} />}
              <rect className="ch-hit" x={cx - band / 2} y={M.top} width={band} height={ph}
                onPointerEnter={(e) => show(e, b.tip)} onPointerDown={(e) => show(e, b.tip)} />
            </g>
          );
        })}
      </svg>
      <ChartTip tip={tip} width={width} />
    </div>
  );
}
