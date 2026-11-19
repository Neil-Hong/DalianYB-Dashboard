import type { Match } from "../lib/data";
import { cx } from "../lib/cx";
import { t, tr, fmtDate, fmtTime, type Lang } from "../i18n";
import "../styles/components/match-row.css";

interface Props { lang: Lang; match: Match; showCompetition?: boolean }

export default function MatchRow({ lang, match: m, showCompetition = true }: Props) {
  const played = m.status === "played";
  const us = m.venue;
  const home = tr(lang, "teams", m.home.name);
  const away = tr(lang, "teams", m.away.name);

  return (
    <li className={cx("match", `venue-${m.venue}`)} data-competition={m.competition}>
      <div className="when">
        <span className="date">{fmtDate(lang, m.kickoff)}</span>
        <span className="time">{fmtTime(lang, m.kickoff, m.time_confirmed)}</span>
      </div>
      {showCompetition && (
        <div className="comp">
          <span className="badge">{tr(lang, "competitions", m.competition)}{m.round && ` · ${t(lang, "round", { n: m.round })}`}</span>
        </div>
      )}
      <div className="teams">
        <span className={cx("team home", { us: us === "home" })}>
          <span className="name" title={home}>{home}</span>
          {m.home.logo && <img className="team-logo" src={m.home.logo} alt="" loading="lazy" width={24} height={24} />}
        </span>
        <span className={cx("score", { pending: !played })}>
          {played && m.score ? `${m.score.home} - ${m.score.away}` : t(lang, "vs")}
          {m.penalties && <small className="pens">{t(lang, "pens")} {m.penalties.home}-{m.penalties.away}</small>}
        </span>
        <span className={cx("team away", { us: us === "away" })}>
          {m.away.logo && <img className="team-logo" src={m.away.logo} alt="" loading="lazy" width={24} height={24} />}
          <span className="name" title={away}>{away}</span>
        </span>
      </div>
      <div className="res">
        {m.result
          ? <span className={`result-pill result-${m.result}`}>{t(lang, m.result)}</span>
          : <span className="venue-tag">{t(lang, m.venue === "home" ? "homeShort" : "awayShort")}</span>}
      </div>
    </li>
  );
}
