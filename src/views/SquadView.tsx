import Shell from "../components/layout/Shell";
import PlayerCard from "../components/PlayerCard";
import { squad, POSITIONS } from "../lib/data";
import { fmtValue } from "../lib/format";
import { t, tr, type Lang } from "../i18n";
import "../styles/components/squad.css";

export const squadTitle = (lang: Lang) => t(lang, "squad.title", { season: squad.season });

export default function SquadView({ lang }: { lang: Lang }) {
  const groups = POSITIONS.map((pos) => ({
    ...pos,
    players: squad.players
      .filter((p) => p.position === pos.key)
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999)),
  }));
  const totalValue = squad.players.reduce((s, p) => s + (p.market_value_eur ?? 0), 0);
  const ages = squad.players.map((p) => p.age).filter((a): a is number => !!a);
  const avgAge = ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : "—";
  const foreign = squad.players.filter((p) => p.nationality && p.nationality !== "中国").length;
  const coaches = squad.staff.filter((s) => s.group === "coach");
  const staffName = (s: (typeof coaches)[number]) => (lang === "zh" ? s.name_zh : s.name_en ?? tr(lang, "people", s.name_zh));

  return (
    <Shell lang={lang} path="/squad">
      <div className="v-squad">
        <div className="wrap">
          <header className="page-head">
            <p className="eyebrow">{t(lang, "squad.eyebrow")}</p>
            <h1>{squadTitle(lang)}</h1>
            <dl className="facts">
              <div><dt>{t(lang, "squad.players")}</dt><dd>{squad.players.length}</dd></div>
              <div><dt>{t(lang, "squad.foreign")}</dt><dd>{foreign}</dd></div>
              <div><dt>{t(lang, "squad.avgAge")}</dt><dd>{avgAge}</dd></div>
              <div><dt>{t(lang, "squad.value")}</dt><dd>{fmtValue(totalValue)}</dd></div>
            </dl>
          </header>
          {groups.map((g) => (
            <section key={g.key} className="pos">
              <h2>{lang === "zh" ? g.zh : g.en} <span>{lang === "zh" ? g.en : g.zh} · {g.players.length}</span></h2>
              <div className="cards">{g.players.map((p) => <PlayerCard key={p.id} lang={lang} player={p} />)}</div>
            </section>
          ))}
          <section className="pos">
            <h2>{t(lang, "squad.staff")}</h2>
            <div className="card staff">
              {coaches.map((c) => (
                <div key={c.id} className="staff-row">
                  {c.photo ? <img src={c.photo} alt="" loading="lazy" width={40} height={40} /> : <span className="ph"></span>}
                  <div><strong>{staffName(c)}</strong><small>{tr(lang, "nationalities", c.nationality)}{c.age && ` · ${t(lang, "age", { n: c.age })}`}</small></div>
                  <span className="badge">{tr(lang, "roles", c.role)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
