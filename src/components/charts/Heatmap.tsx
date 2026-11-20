"use client";
import { useChart } from "./useChart";
import ChartTip from "./ChartTip";

interface Props {
  /** cells[row][col]; rows are drawn top to bottom in the given order */
  cells: number[][];
  rows: string[];
  cols: string[];
  rowTitle: string;
  colTitle: string;
  /** outcome per cell, for colouring (win / draw / loss) */
  tone: ("W" | "D" | "L")[][];
  tips: string[][];
  ariaLabel: string;
}

const M = { top: 26, right: 8, bottom: 8, left: 44 };

/** Scoreline frequency grid (goals for × goals against). */
export default function Heatmap({ cells, rows, cols, rowTitle, colTitle, tone, tips, ariaLabel }: Props) {
  const { ref, width, inView, tip, show, hide } = useChart(360);
  const size = Math.min(56, (Math.min(width, 420) - M.left - M.right) / cols.length);
  const w = M.left + M.right + size * cols.length;
  const h = M.top + M.bottom + size * rows.length;
  const max = Math.max(1, ...cells.flat());

  return (
    <div ref={ref} className={inView ? "ch ch-center in" : "ch ch-center"} onPointerLeave={hide}>
      <svg width={w} height={h + 16} viewBox={`0 0 ${w} ${h + 16}`} role="img" aria-label={ariaLabel}>
        <g className="ch-grid">
          <text className="ch-axis-label" x={M.left + (size * cols.length) / 2} y={10} textAnchor="middle">{colTitle} →</text>
          {cols.map((c, j) => <text key={c} x={M.left + size * (j + 0.5)} y={M.top - 4} textAnchor="middle">{c}</text>)}
          {rows.map((r, i) => <text key={r} x={M.left - 8} y={M.top + size * (i + 0.5)} dy=".32em" textAnchor="end">{r}</text>)}
          <text className="ch-axis-label" x={M.left} y={h + 12}>↑ {rowTitle}</text>
        </g>
        {cells.map((row, i) => row.map((n, j) => (
          <g key={`${i}-${j}`} className="ch-cell" style={{ transitionDelay: `${(i + j) * 0.05}s` }}>
            <rect x={M.left + size * j + 1.5} y={M.top + size * i + 1.5} width={size - 3} height={size - 3} rx={6}
              className={n ? `ch-heat ch-r-${tone[i][j]}` : "ch-heat empty"} style={n ? { fillOpacity: 0.18 + 0.82 * (n / max) } : undefined} />
            {n > 0 && <text className="ch-heat-n" x={M.left + size * (j + 0.5)} y={M.top + size * (i + 0.5)} dy=".35em" textAnchor="middle">{n}</text>}
            {n > 0 && <rect className="ch-hit" x={M.left + size * j} y={M.top + size * i} width={size} height={size}
              onPointerEnter={(e) => show(e, tips[i][j] ? tips[i][j].split("\n") : [])} onPointerDown={(e) => show(e, tips[i][j].split("\n"))} />}
          </g>
        )))}
      </svg>
      <ChartTip tip={tip} width={width} />
    </div>
  );
}
