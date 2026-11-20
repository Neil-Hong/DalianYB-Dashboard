import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import "../../styles/components/charts.css";

export interface LegendItem { label: string; tone: string; dashed?: boolean }
export interface DataTable { caption: string; head: string[]; rows: (string | number)[][] }

interface Props {
  title: string;
  sub?: string;
  legend?: LegendItem[];
  /** the same numbers as an accessible table, collapsed under the chart */
  table?: DataTable;
  tableLabel?: string;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}

/** Card frame shared by every chart: title, legend, the chart, and its data table. */
export default function ChartCard({ title, sub, legend, table, tableLabel = "Data", wide, className, children }: Props) {
  return (
    <section className={cx("card card-pad ch-card", { wide }, className)}>
      <header className="ch-head">
        <div>
          <h2>{title}</h2>
          {sub && <p className="ch-sub">{sub}</p>}
        </div>
        {legend && legend.length > 0 && (
          <ul className="ch-legend" aria-hidden="true">
            {legend.map((l) => <li key={l.label}><i className={cx(`ch-key ch-${l.tone}`, { dashed: l.dashed })} />{l.label}</li>)}
          </ul>
        )}
      </header>
      {children}
      {table && (
        <details className="ch-data">
          <summary>{tableLabel}</summary>
          <div className="table-scroll">
            <table className="data">
              <caption className="sr-only">{table.caption}</caption>
              <thead><tr>{table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === "number" ? "num" : undefined}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
