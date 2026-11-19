import ClubBadge from "./ClubBadge";
import { club, clubLogos, type PlayerProfile } from "../../lib/data";
import { dash } from "../../lib/format";
import { t, tr, type Lang } from "../../i18n";
import "../../styles/components/career-table.css";

export default function CareerTable({ lang, rows }: { lang: Lang; rows: PlayerProfile["career"] }) {
  return (
    <div className="table-scroll">
      <table className="data career">
        <thead><tr>
          <th>{t(lang, "player.season")}</th><th>{t(lang, "player.club")}</th>
          <th className="num">{t(lang, "stat.apps")}</th><th className="num">{t(lang, "player.starts")}</th>
          <th className="num">{t(lang, "stat.goals")}</th><th className="num">{t(lang, "stat.assists")}</th>
          <th className="num">{t(lang, "player.yellow")}</th><th className="num">{t(lang, "player.red")}</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.season}-${r.club}-${i}`} className={r.club === club.name_zh ? "us" : undefined}>
              <td>{r.season}</td>
              <td><span className="cclub"><ClubBadge logo={clubLogos[r.club]} name={tr(lang, "clubs", r.club)} size={22} />{tr(lang, "clubs", r.club)}</span></td>
              <td className="num">{dash(r.apps)}</td><td className="num">{dash(r.starts)}</td>
              <td className="num">{dash(r.goals)}</td><td className="num">{dash(r.assists)}</td>
              <td className="num">{dash(r.yellow)}</td><td className="num">{dash(r.red)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
