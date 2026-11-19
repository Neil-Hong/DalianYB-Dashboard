import Shell from "../components/layout/Shell";
import MatchRow from "../components/MatchRow";
import FixturesClient from "../client/FixturesClient";
import { fixturesBySeason, seasons, currentSeason, type Match } from "../lib/data";
import { cx } from "../lib/cx";
import { t, tr, href, fmtMonth, type Lang } from "../i18n";
import "../styles/components/fixtures.css";

export default function FixturesView({ lang, season }: { lang: Lang; season: string }) {
  // newest first
  const matches = [...(fixturesBySeason[season] ?? [])].reverse();
  const comps = [...new Set(matches.map((m) => m.competition))];
  const summary = comps.map((c) => {
    const ms = matches.filter((m) => m.competition === c && m.result);
    return { c, w: ms.filter((m) => m.result === "W").length, d: ms.filter((m) => m.result === "D").length, l: ms.filter((m) => m.result === "L").length, n: ms.length };
  });
  const byMonth = new Map<string, Match[]>();
  for (const m of matches) {
    const k = fmtMonth(lang, m.kickoff);
    byMonth.set(k, [...(byMonth.get(k) ?? []), m]);
  }
  const seasonPath = (s: string) => (s === currentSeason ? "/fixtures" : `/fixtures/${s}`);

  return (
    <Shell lang={lang} path={seasonPath(season)}>
      <div className="v-fixtures">
        <div className="wrap">
          <header className="page-head">
            <p className="eyebrow">{t(lang, "fixtures.eyebrow")}</p>
            <h1>{t(lang, "fixtures.title", { season })}</h1>
            {seasons.length > 1 && (
              <nav className="seasons" aria-label="Seasons">
                {seasons.map((s) => <a key={s} href={href(lang, seasonPath(s))} className={cx({ active: s === season }) || undefined}>{s}</a>)}
              </nav>
            )}
          </header>
          <div className="summary">
            {summary.filter((s) => s.n > 0).map((s) => (
              <div key={s.c} className="card sum">
                <span className="sum-c">{tr(lang, "competitions", s.c)}</span>
                <span className="sum-r"><b className="w">{s.w}</b>{t(lang, "W")} <b className="d">{s.d}</b>{t(lang, "D")} <b className="l">{s.l}</b>{t(lang, "L")}</span>
              </div>
            ))}
          </div>
          <div className="filters" role="group">
            <button type="button" className="chip active" data-filter="">{t(lang, "fixtures.all")}</button>
            {comps.map((c) => <button key={c} type="button" className="chip" data-filter={c}>{tr(lang, "competitions", c)}</button>)}
          </div>
          {matches.length === 0 && <p className="empty">{t(lang, "fixtures.empty")}</p>}
          {[...byMonth].map(([month, ms]) => (
            <section key={month} className="month" data-month>
              <h2>{month}</h2>
              <ul className="card list">{ms.map((m) => <MatchRow key={m.id} lang={lang} match={m} />)}</ul>
            </section>
          ))}
        </div>
      </div>
      <FixturesClient />
    </Shell>
  );
}
