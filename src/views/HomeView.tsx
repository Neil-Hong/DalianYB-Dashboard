import Shell from "../components/layout/Shell";
import MatchRow from "../components/MatchRow";
import StandingsTable from "../components/StandingsTable";
import NewsCard from "../components/NewsCard";
import Intro from "../components/Intro";
import { news, pinnedNews } from "../lib/news";
import { club, squad, standings, currentSeason, nextMatch, playedMatches, isChampion, personName, LEAGUE } from "../lib/data";
import { t, tr, href, fmtFullDate, fmtTime, type Lang, type UIKey } from "../i18n";
import "../styles/components/home.css";

export default function HomeView({ lang }: { lang: Lang }) {
  const zh = lang === "zh";
  const next = nextMatch();
  const played = playedMatches();
  const recent = played.slice(-5).reverse();
  const form = played.filter((m) => m.competition === LEAGUE).slice(-5);
  const us = standings.find((r) => r.is_us);
  const champion = isChampion();
  const headlines = [...pinnedNews, ...news.filter((n) => !n.pinned)].slice(0, 5);
  const coach = squad.staff.find((s) => s.role === "主教练");

  const outfield = squad.players.filter((p) => p.position !== "goalkeeper");
  const leaders = ([
    { title: "home.scorers", key: "goals" },
    { title: "home.assists", key: "assists" },
    { title: "home.apps", key: "apps" },
  ] as { title: UIKey; key: string }[]).map((l) => ({
    ...l,
    rows: (l.key === "apps" ? squad.players : outfield)
      .filter((p) => (p.season_stats[l.key] ?? 0) > 0)
      .sort((a, b) => (b.season_stats[l.key] ?? 0) - (a.season_stats[l.key] ?? 0))
      .slice(0, 5),
  }));

  return (
    <Shell lang={lang} path="/" intro={<Intro lang={lang} />}>
      <div className="v-home">
        <section className="hero">
          <div className="wrap hero-inner">
            <div className="hero-text">
              <p className="eyebrow light">{t(lang, "home.season", { season: currentSeason, league: zh ? club.league : club.league_en })}</p>
              <h1 className={zh ? undefined : "latin"}>{zh ? club.name_zh : club.name_en}</h1>
              <p className="hero-sub">{zh ? club.name_en : club.name_zh}</p>
              {champion && <p className="champ"><span>★</span> {t(lang, "home.champion", { season: currentSeason })}</p>}
              {us && (
                <dl className="hero-stats">
                  <div><dt>{t(lang, "home.rank")}</dt><dd>{us.rank}</dd></div>
                  <div><dt>{t(lang, "home.points")}</dt><dd>{us.points}</dd></div>
                  <div><dt>{t(lang, "home.wdl")}</dt><dd>{us.won}<i>/</i>{us.drawn}<i>/</i>{us.lost}</dd></div>
                  <div><dt>{t(lang, "home.goals")}</dt><dd>{us.goals_for}<i>/</i>{us.goals_against}</dd></div>
                </dl>
              )}
            </div>
            <img className="hero-logo" src={club.logo} alt={club.name_en} width={220} height={220} />
          </div>
        </section>

        <div className="wrap home-grid">
          <div className="col-main grid">
            {next && (
              <section className="card next">
                <div className="next-head">
                  <span className="eyebrow">{t(lang, "home.next")}</span>
                  <span className="badge">{tr(lang, "competitions", next.competition)}{next.round && ` · ${t(lang, "round", { n: next.round })}`}</span>
                </div>
                <div className="next-body">
                  <div className="side">
                    {next.home.logo && <img src={next.home.logo} alt="" width={64} height={64} />}
                    <strong>{tr(lang, "teams", next.home.name)}</strong>
                  </div>
                  <div className="next-mid">
                    <span className="next-date">{fmtFullDate(lang, next.kickoff)}</span>
                    <span className="next-time">{fmtTime(lang, next.kickoff, next.time_confirmed)}</span>
                    <span className="next-venue">{next.venue === "home" ? t(lang, "home.homeAt", { stadium: zh ? club.stadium : club.stadium_en }) : t(lang, "home.away")}</span>
                  </div>
                  <div className="side">
                    {next.away.logo && <img src={next.away.logo} alt="" width={64} height={64} />}
                    <strong>{tr(lang, "teams", next.away.name)}</strong>
                  </div>
                </div>
              </section>
            )}

            {headlines.length > 0 && (
              <section className="card card-pad">
                <div className="card-title"><h2>{t(lang, "home.news")}</h2><a href={href(lang, "/news")}>{t(lang, "home.moreNews")}</a></div>
                <ul className="list news-list">{headlines.map((n) => <NewsCard key={n.id} lang={lang} item={n} compact />)}</ul>
              </section>
            )}

            <section className="card">
              <div className="card-title card-pad pb0">
                <h2>{t(lang, "home.recent")}</h2>
                <a href={href(lang, "/fixtures")}>{t(lang, "home.allFixtures")}</a>
              </div>
              <ul className="list">{recent.map((m) => <MatchRow key={m.id} lang={lang} match={m} />)}</ul>
            </section>

            <section className="card card-pad">
              <div className="card-title"><h2>{t(lang, "home.stats", { season: currentSeason })}</h2><a href={href(lang, "/squad")}>{t(lang, "home.fullSquad")}</a></div>
              <div className="leaders">
                {leaders.map((l) => (
                  <div key={l.key} className="leader">
                    <h3>{t(lang, l.title)}</h3>
                    <ol>
                      {l.rows.map((p) => (
                        <li key={p.id}>
                          <a href={href(lang, `/players/${p.id}`)}>
                            {p.photo && <img src={p.photo} alt="" loading="lazy" width={32} height={32} />}
                            <span className="lname">{personName(lang, p)}</span>
                            <span className="lval">{p.season_stats[l.key]}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="col-side grid">
            <section className="card card-pad">
              <div className="card-title"><h2>{t(lang, "home.table")}</h2><a href={href(lang, "/table")}>{t(lang, "home.fullTable")}</a></div>
              <StandingsTable lang={lang} rows={standings} compact />
              {form.length > 0 && (
                <div className="form">
                  <span>{t(lang, "home.form")}</span>
                  <span className="pills">{form.map((m) => <span key={m.id} className={`result-pill result-${m.result}`}>{t(lang, m.result!)}</span>)}</span>
                </div>
              )}
            </section>

            <section className="card card-pad club-facts">
              <div className="card-title"><h2>{t(lang, "home.club")}</h2></div>
              <dl>
                <div><dt>{t(lang, "home.founded")}</dt><dd>{club.founded}</dd></div>
                <div><dt>{t(lang, "home.city")}</dt><dd>{zh ? club.city : club.city_en}</dd></div>
                <div><dt>{t(lang, "home.stadium")}</dt><dd>{zh ? club.stadium : club.stadium_en}</dd></div>
                <div><dt>{t(lang, "home.capacity")}</dt><dd>{t(lang, "home.seats", { n: club.capacity.toLocaleString(zh ? "zh-CN" : "en-GB") })}</dd></div>
                <div><dt>{t(lang, "home.coach")}</dt><dd>{coach ? (zh ? coach.name_zh : coach.name_en ?? tr(lang, "people", coach.name_zh)) : "—"}</dd></div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
