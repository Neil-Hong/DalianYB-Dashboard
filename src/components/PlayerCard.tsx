import { personName, type Player } from "../lib/data";
import { t, tr, href, type Lang, type UIKey } from "../i18n";
import "../styles/components/player-card.css";

interface Props { lang: Lang; player: Player }

export default function PlayerCard({ lang, player: p }: Props) {
  const s = p.season_stats;
  const stats: [UIKey, number | null | undefined][] = p.position === "goalkeeper"
    ? [["stat.apps", s.apps], ["stat.saves", s.saves], ["stat.clearancesShort", s.clearances]]
    : [["stat.apps", s.apps], ["stat.goals", s.goals], ["stat.assists", s.assists]];
  const name = personName(lang, p);
  const sub = lang === "zh" ? p.name_en : p.name_zh;

  return (
    <a href={href(lang, `/players/${p.id}`)} className="pcard card">
      <div className="top">
        <span className="num">{p.number ?? "–"}</span>
        {p.photo
          ? <img className="photo" src={p.photo} alt={name} loading="lazy" width={84} height={84} />
          : <span className="photo placeholder" aria-hidden="true"></span>}
      </div>
      <div className="who">
        <h3>{name}{p.captain && <span className="cap" title={t(lang, "player.captain")}>C</span>}</h3>
        <p className="sub">{sub ?? " "}</p>
        <p className="meta">
          {tr(lang, "nationalities", p.nationality) || "—"}{p.age && ` · ${t(lang, "age", { n: p.age })}`}
          {p.u21 && <span className="badge u21">U21</span>}
        </p>
      </div>
      <dl className="stats">
        {stats.map(([label, v]) => (
          <div key={label}><dt>{t(lang, label)}</dt><dd>{v ?? "–"}</dd></div>
        ))}
      </dl>
    </a>
  );
}
