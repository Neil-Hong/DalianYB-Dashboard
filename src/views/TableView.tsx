import Shell from "../components/layout/Shell";
import StandingsTable from "../components/StandingsTable";
import { standings, currentSeason, club } from "../lib/data";
import { t, type Lang } from "../i18n";

export const tableTitle = (lang: Lang) => t(lang, "table.title", { season: currentSeason });

export default function TableView({ lang }: { lang: Lang }) {
  return (
    <Shell lang={lang} path="/table">
      <div className="wrap">
        <header className="page-head">
          <p className="eyebrow">{lang === "zh" ? "积分榜" : "League table"}</p>
          <h1>{tableTitle(lang)}</h1>
          <p className="sub">{lang === "zh" ? club.league : club.league_en}</p>
        </header>
        <section className="card card-pad">
          {standings.length ? <StandingsTable lang={lang} rows={standings} /> : <p className="empty">{t(lang, "table.empty")}</p>}
        </section>
      </div>
    </Shell>
  );
}
