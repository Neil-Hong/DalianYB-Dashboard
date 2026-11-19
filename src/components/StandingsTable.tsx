import type { StandingRow } from "../lib/data";
import { cx } from "../lib/cx";
import { t, tr, type Lang } from "../i18n";
import "../styles/components/standings-table.css";

interface Props { lang: Lang; rows: StandingRow[]; compact?: boolean }

export default function StandingsTable({ lang, rows, compact = false }: Props) {
  // compact: show top 3 plus our row with one neighbour either side
  let shown = rows;
  if (compact) {
    const usIdx = rows.findIndex((r) => r.is_us);
    const keep = new Set([0, 1, 2, usIdx - 1, usIdx, usIdx + 1].filter((i) => i >= 0 && i < rows.length));
    shown = rows.filter((_, i) => keep.has(i));
  }
  const gd = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="table-scroll">
      <table className="data standings">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>{t(lang, "table.team")}</th>
            <th className="num">{t(lang, "table.p")}</th>
            {!compact && <th className="num">{t(lang, "table.w")}</th>}
            {!compact && <th className="num">{t(lang, "table.d")}</th>}
            {!compact && <th className="num">{t(lang, "table.l")}</th>}
            {!compact && <th className="num">{t(lang, "table.gfga")}</th>}
            <th className="num">{t(lang, "table.gd")}</th>
            <th className="num">{t(lang, "table.pts")}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.team_id || r.team} className={cx({ us: r.is_us, gap: compact && i > 0 && r.rank - shown[i - 1].rank > 1 }) || undefined}>
              <td className="num rank">{r.rank}</td>
              <td>
                <span className="team-cell">
                  {r.logo && <img className="team-logo" src={r.logo} alt="" loading="lazy" width={24} height={24} />}
                  {tr(lang, "teams", r.team)}
                </span>
              </td>
              <td className="num">{r.played}</td>
              {!compact && <td className="num">{r.won}</td>}
              {!compact && <td className="num">{r.drawn}</td>}
              {!compact && <td className="num">{r.lost}</td>}
              {!compact && <td className="num">{r.goals_for}/{r.goals_against}</td>}
              <td className="num">{gd(r.goal_diff)}</td>
              <td className="num pts">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
