import Shell from "../components/layout/Shell";
import AbilityCard from "../components/player/AbilityCard";
import CareerTable from "../components/player/CareerTable";
import TransferList from "../components/player/TransferList";
import Chevron from "../components/player/Chevron";
import Modal from "../components/Modal";
import { profiles, positionName, personName, club, type Player, type PlayerProfile } from "../lib/data";
import { fmtValue, dash } from "../lib/format";
import { cx, vars } from "../lib/cx";
import { t, tr, type Lang } from "../i18n";
import "../styles/components/player.css";

const PREVIEW = 5; // newest entries shown on the page; the rest open in a modal

export default function PlayerView({ lang, player }: { lang: Lang; player: Player }) {
  const profile: PlayerProfile | undefined = profiles[player.id];
  const p = { ...player, ...(profile ?? {}) } as PlayerProfile;
  const s = p.season_stats;
  const name = personName(lang, p);
  const sub = lang === "zh" ? p.name_en : p.name_zh;
  const clubName = lang === "zh" ? club.name_zh : club.name_en;

  const seasonStats = p.position === "goalkeeper"
    ? ([["stat.apps", s.apps], ["stat.saves", s.saves], ["stat.clearances", s.clearances]] as const)
    : ([["stat.apps", s.apps], ["stat.goals", s.goals], ["stat.assists", s.assists]] as const);

  const info: [string, unknown][] = [
    [t(lang, "player.position"), positionName(lang, p.position)],
    [t(lang, "player.number"), p.number],
    [t(lang, "player.nationality"), tr(lang, "nationalities", p.nationality)],
    [t(lang, "player.born"), p.birth_date],
    [t(lang, "player.age"), p.age],
    [t(lang, "player.height"), p.height && `${p.height} cm`],
    [t(lang, "player.weight"), p.weight && `${p.weight} kg`],
    [t(lang, "player.foot"), tr(lang, "foot", p.foot)],
    [t(lang, "player.value"), fmtValue(p.market_value_eur)],
  ];
  const career = profile?.career ?? [];
  const transfers = profile?.transfers ?? [];
  const honours = profile?.honours ?? [];
  const injuries = profile?.injuries ?? [];
  const careerTotals = career.reduce(
    (acc, r) => ({ apps: acc.apps + (r.apps ?? 0), goals: acc.goals + (r.goals ?? 0), assists: acc.assists + (r.assists ?? 0) }),
    { apps: 0, goals: 0, assists: 0 },
  );
  const clubLabel = (c: string | null) => tr(lang, "clubs", c);

  return (
    <Shell lang={lang} path={`/players/${player.id}`}>
      <div className="v-player">
        <section className="phero">
          <div className="wrap phero-inner">
            <div className="avatar">
              {p.photo && <img src={p.photo} alt={name} width={140} height={140} />}
              <span className="pnum">{p.number ?? ""}</span>
            </div>
            <div>
              <p className="eyebrow light">{positionName(lang, p.position)} · {clubName}</p>
              <h1>{name}{p.u21 && <span className="badge u21">U21</span>}</h1>
              {sub && <p className="psub">{sub}</p>}
              <dl className="pstats">
                {seasonStats.map(([label, v]) => <div key={label}><dt>{t(lang, "stat.season", { label: t(lang, label) })}</dt><dd>{v ?? "–"}</dd></div>)}
              </dl>
            </div>
          </div>
        </section>

        <div className="wrap pmain">
          <div className="row-top">
            <section className="card card-pad info">
              <div className="card-title"><h2>{t(lang, "player.info")}</h2></div>
              <dl>{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{dash(v)}</dd></div>)}</dl>
              <p className="src"><a href={p.links.dongqiudi ?? "#"} target="_blank" rel="noopener">{t(lang, "player.source")}</a></p>
            </section>
            <AbilityCard lang={lang} ability={profile?.ability} />
          </div>

          {!profile && <section className="card card-pad"><p className="empty">{t(lang, "player.pending")}</p></section>}

          {(honours.length > 0 || injuries.length > 0) && (
            <div className={cx("row-mid", { solo: !honours.length || !injuries.length })}>
              {honours.length > 0 && (
                <section className="card card-pad">
                  <div className="card-title"><h2>{t(lang, "player.honours")}</h2></div>
                  <ul className="honours">
                    {honours.map((h, i) => (
                      <li key={h.name} style={vars({ "--i": i })}>
                        <span className="h-icon">
                          {h.logo
                            ? <img src={h.logo} alt="" loading="lazy" width={38} height={38} />
                            : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Zm0 1H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3m-5 4v3m-3 5h6l-.8-3H9.8L9 20Z" /></svg>}
                        </span>
                        <span className="h-name">{tr(lang, "honours", h.name)}</span>
                        <span className="h-count" title={t(lang, "player.timesWon", { n: h.count })}><small>×</small>{h.count}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {injuries.length > 0 && (
                <section className="card card-pad">
                  <div className="card-title"><h2>{t(lang, "player.injuries")}</h2></div>
                  <ul className="injuries">
                    {injuries.map((i, k) => <li key={k}><span>{tr(lang, "injuries", i.type)}</span><small>{i.from} ~ {i.to}{i.team && ` · ${clubLabel(i.team)}`}</small></li>)}
                  </ul>
                </section>
              )}
            </div>
          )}

          {career.length > 0 && (
            <section className="card card-pad">
              <div className="card-title"><h2>{t(lang, "player.career")}</h2><span className="muted">{t(lang, "player.careerTotal", careerTotals)}</span></div>
              <CareerTable lang={lang} rows={career.slice(0, PREVIEW)} />
              {career.length > PREVIEW && (
                <div className="more">
                  <span className="muted">{t(lang, "player.showing", { n: PREVIEW, total: career.length })}</span>
                  <button type="button" className="more-btn" data-modal-open="career-modal">{t(lang, "player.viewMore", { n: career.length })}<Chevron /></button>
                </div>
              )}
            </section>
          )}

          {transfers.length > 0 && (
            <section className="card card-pad">
              <div className="card-title"><h2>{t(lang, "player.transfers")}</h2></div>
              <TransferList lang={lang} items={transfers.slice(0, PREVIEW)} />
              {transfers.length > PREVIEW && (
                <div className="more">
                  <span className="muted">{t(lang, "player.showing", { n: PREVIEW, total: transfers.length })}</span>
                  <button type="button" className="more-btn" data-modal-open="transfers-modal">{t(lang, "player.viewMore", { n: transfers.length })}<Chevron /></button>
                </div>
              )}
            </section>
          )}
        </div>

        {career.length > PREVIEW && (
          <Modal id="career-modal" lang={lang} title={`${t(lang, "player.career")} · ${name}`} subtitle={t(lang, "player.careerTotal", careerTotals)}>
            <CareerTable lang={lang} rows={career} />
          </Modal>
        )}
        {transfers.length > PREVIEW && (
          <Modal id="transfers-modal" lang={lang} title={`${t(lang, "player.transfers")} · ${name}`}>
            <TransferList lang={lang} items={transfers} />
          </Modal>
        )}
      </div>
    </Shell>
  );
}
