import Shell from "../components/layout/Shell";
import ChartCard from "../components/charts/ChartCard";
import LineChart, { type LineSeries, type Tone } from "../components/charts/LineChart";
import DivergingBars from "../components/charts/DivergingBars";
import ScatterChart from "../components/charts/ScatterChart";
import Heatmap from "../components/charts/Heatmap";
import { Butterfly, HBars, GroupedBars } from "../components/charts/Bars";
import { currentSeason } from "../lib/data";
import { seasonStats, statSeasons, leagueTable, type Played, type Record3 } from "../lib/stats";
import { cx, vars } from "../lib/cx";
import { tr, href, fmtDate, type Lang } from "../i18n";
import { st } from "../i18n/stats";
import "../styles/components/stats.css";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const dec = (v: number, n = 2) => v.toFixed(n);
const per = (n: number, p: number) => (p ? n / p : 0);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export const statsTitle = (lang: Lang, season: string) => st(lang, "title", { season });
export const statsPath = (season: string) => (season === currentSeason ? "/stats" : `/stats/${season}`);

export default function StatsView({ lang, season }: { lang: Lang; season: string }) {
  const s = seasonStats(season);
  const league = s.league ? tr(lang, "competitions", s.league) : "";
  const team = (name: string) => tr(lang, "teams", name);
  const venue = (x: Played) => st(lang, x.home ? "ha.home" : "ha.away");
  const score = (x: Played) => `${x.gf}–${x.ga}`;
  /** tooltip lines for one match, from our point of view */
  const matchTip = (x: Played, extra?: string) => [
    x.round != null ? st(lang, "tip.round", { n: x.round, date: fmtDate(lang, x.m.kickoff) }) : `${tr(lang, "competitions", x.m.competition)} · ${fmtDate(lang, x.m.kickoff)}`,
    `${st(lang, "tip.vs", { venue: venue(x), opp: team(x.opp.name) })}`,
    `${st(lang, x.result)} ${score(x)}`,
    ...(extra ? [extra] : []),
  ];
  const matchName = (x: Played | null) => (x ? `${score(x)} · ${st(lang, "tip.vs", { venue: venue(x), opp: team(x.opp.name) })}` : "—");

  const hasLeague = s.leagueMatches.length > 0;
  const others = statSeasons.filter((y) => y !== season).map((y) => seasonStats(y)).filter((o) => o.leagueMatches.length);
  const tones: Tone[] = ["navy", "muted", "sky"];

  // ---- points race: this season (gold, with result markers) against earlier seasons (dashed)
  const raceSeries: LineSeries[] = [
    ...others.map((o, i) => ({
      key: o.season, tone: tones[i % tones.length], dashed: true,
      points: o.cumulative.map((c) => ({ x: c.n, y: c.pts })),
    })),
    {
      key: season, tone: "gold" as Tone, area: true, markers: true,
      points: s.cumulative.map((c) => ({ x: c.n, y: c.pts, result: c.x.result, tip: matchTip(c.x, st(lang, "race.points", { n: c.pts })) })),
    },
  ];
  const raceLegend = [
    { label: `${season}${league ? ` · ${league}` : ""}`, tone: "gold" },
    ...others.map((o, i) => ({ label: `${o.season} · ${tr(lang, "competitions", o.league ?? "")}`, tone: tones[i % tones.length], dashed: true })),
  ];

  // ---- scoreline grid: rows = goals scored 4+..0 (top to bottom), cols = conceded 0..4+
  const labels = ["0", "1", "2", "3", "4+"];
  const rowsDesc = [4, 3, 2, 1, 0];
  const heat = rowsDesc.map((gf) => s.scorelines[gf]);
  const heatTone = rowsDesc.map((gf) => labels.map((_, ga) => (gf > ga ? "W" : gf === ga ? "D" : "L") as "W" | "D" | "L"));
  const heatTips = rowsDesc.map((gf) => labels.map((_, ga) => `${labels[gf]}–${labels[ga]}\n${st(lang, "score.tip", { n: s.scorelines[gf][ga] })}`));

  const recordRow = (label: string, r: Record3): (string | number)[] => [label, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts];
  const recordHead = [st(lang, "col.comp"), st(lang, "col.p"), st(lang, "col.w"), st(lang, "col.d"), st(lang, "col.l"), st(lang, "col.gf"), st(lang, "col.ga"), st(lang, "col.pts")];
  const matchHead = [st(lang, "col.round"), st(lang, "col.date"), st(lang, "col.opp"), st(lang, "col.venue"), st(lang, "col.score")];
  const matchRow = (x: Played): (string | number)[] => [x.round ?? "—", fmtDate(lang, x.m.kickoff), team(x.opp.name), venue(x), score(x)];

  const table = leagueTable(season);
  const all = [season, ...others.map((o) => o.season)].sort();
  const bySeason = new Map([[season, s], ...others.map((o) => [o.season, o] as const)]);

  return (
    <Shell lang={lang} path={statsPath(season)}>
      <div className="v-stats">
        <div className="wrap">
          <header className="page-head">
            <p className="eyebrow">{st(lang, "eyebrow")}</p>
            <h1>{statsTitle(lang, season)}</h1>
            {league && <p className="sub">{st(lang, "leagueNote", { league })}</p>}
            {statSeasons.length > 1 && (
              <nav className="seasons" aria-label="Seasons">
                {statSeasons.map((y) => <a key={y} href={href(lang, statsPath(y))} className={cx({ active: y === season }) || undefined}>{y}</a>)}
              </nav>
            )}
          </header>

          {!hasLeague && <p className="empty">{st(lang, "empty")}</p>}

          {hasLeague && (
            <>
              <dl className="kpis">
                {s.position != null
                  ? <div className="card kpi gold"><dt>{st(lang, "kpi.position")}</dt><dd>{s.position}</dd></div>
                  : <div className="card kpi"><dt>{st(lang, "kpi.played")}</dt><dd>{s.total.p}</dd></div>}
                <div className="card kpi"><dt>{st(lang, "kpi.points")}</dt><dd>{s.total.pts}</dd></div>
                <div className="card kpi"><dt>{st(lang, "kpi.wdl")}</dt><dd>{s.total.w}<i>/</i>{s.total.d}<i>/</i>{s.total.l}</dd></div>
                <div className="card kpi"><dt>{st(lang, "kpi.goals")}</dt><dd>{s.total.gf}<i>/</i>{s.total.ga}</dd></div>
                <div className="card kpi"><dt>{st(lang, "kpi.gd")}</dt><dd className={s.total.gf - s.total.ga >= 0 ? "pos" : "neg"}>{signed(s.total.gf - s.total.ga)}</dd></div>
                <div className="card kpi"><dt>{st(lang, "kpi.clean")}</dt><dd>{s.cleanSheets}</dd></div>
                <div className="card kpi"><dt>{st(lang, "kpi.winRate")}</dt><dd>{pct(s.winRate)}</dd></div>
                <div className="card kpi"><dt>{st(lang, "kpi.ppg")}</dt><dd>{dec(s.ppg)}</dd></div>
              </dl>

              <div className="st-grid">
                <ChartCard wide title={st(lang, "race.title")} sub={st(lang, "race.sub")} legend={raceLegend} tableLabel={st(lang, "data")}
                  table={{ caption: st(lang, "race.title"), head: [...matchHead, st(lang, "col.pts")], rows: s.cumulative.map((c) => [...matchRow(c.x), c.pts]) }}>
                  <LineChart series={raceSeries} xLabel={st(lang, "roll.match")} ariaLabel={`${st(lang, "race.title")}: ${s.total.pts}`} />
                </ChartCard>

                <section className="card card-pad form-card">
                  <header className="ch-head"><div><h2>{st(lang, "form.title")}</h2><p className="ch-sub">{st(lang, "form.sub")}</p></div></header>
                  <ol className="form-strip">
                    {s.form.map((x, i) => (
                      <li key={x.m.id} style={vars({ "--i": i })} title={matchTip(x).join(" · ")}>
                        <span className={`result-pill result-${x.result}`}>{st(lang, x.result).slice(0, 1)}</span>
                        <small>{score(x)}</small>
                      </li>
                    ))}
                  </ol>
                  <dl className="facts">
                    <div><dt>{st(lang, "form.unbeaten")}</dt><dd>{st(lang, "form.matches", { n: s.unbeatenRun })}</dd></div>
                    <div><dt>{st(lang, "form.winning")}</dt><dd>{st(lang, "form.matches", { n: s.winningRun })}</dd></div>
                    <div><dt>{st(lang, "form.bigWin")}</dt><dd>{matchName(s.biggestWin)}</dd></div>
                    <div><dt>{st(lang, "form.bigLoss")}</dt><dd>{matchName(s.heaviestLoss)}</dd></div>
                  </dl>
                </section>

                <ChartCard title={st(lang, "ha.title")} sub={st(lang, "ha.sub")}>
                  <Butterfly leftTitle={st(lang, "ha.home")} rightTitle={st(lang, "ha.away")} rows={[
                    { label: st(lang, "ha.ppg"), left: per(s.home.pts, s.home.p), right: per(s.away.pts, s.away.p), fmt: (v) => dec(v), max: 3 },
                    { label: st(lang, "ha.winRate"), left: per(s.home.w, s.home.p), right: per(s.away.w, s.away.p), fmt: pct, max: 1 },
                    { label: st(lang, "ha.gf"), left: per(s.home.gf, s.home.p), right: per(s.away.gf, s.away.p), fmt: (v) => dec(v, 1) },
                    { label: st(lang, "ha.ga"), left: per(s.home.ga, s.home.p), right: per(s.away.ga, s.away.p), fmt: (v) => dec(v, 1) },
                    { label: st(lang, "ha.cs"), left: s.leagueMatches.filter((x) => x.home && x.ga === 0).length,
                      right: s.leagueMatches.filter((x) => !x.home && x.ga === 0).length, fmt: (v) => String(v) },
                  ]} />
                  <p className="ha-records">
                    <span>{st(lang, "ha.home")}: {s.home.w}-{s.home.d}-{s.home.l}</span>
                    <span>{st(lang, "ha.away")}: {s.away.w}-{s.away.d}-{s.away.l}</span>
                  </p>
                </ChartCard>

                <ChartCard wide title={st(lang, "goals.title")} sub={st(lang, "goals.sub")} tableLabel={st(lang, "data")}
                  legend={[{ label: st(lang, "goals.for"), tone: "up" }, { label: st(lang, "goals.against"), tone: "down" }]}
                  table={{ caption: st(lang, "goals.title"), head: matchHead, rows: s.leagueMatches.map(matchRow) }}>
                  <DivergingBars ariaLabel={`${st(lang, "goals.title")}: ${s.total.gf}–${s.total.ga}`}
                    bars={s.leagueMatches.map((x, i) => ({ label: String(i + 1), up: x.gf, down: x.ga, result: x.result, tip: matchTip(x) }))} />
                </ChartCard>

                <ChartCard title={st(lang, "score.title")} sub={st(lang, "score.sub")}
                  legend={[{ label: st(lang, "W"), tone: "W" }, { label: st(lang, "D"), tone: "D" }, { label: st(lang, "L"), tone: "L" }]}>
                  <Heatmap cells={heat} rows={rowsDesc.map((i) => labels[i])} cols={labels} tone={heatTone} tips={heatTips}
                    rowTitle={st(lang, "score.for")} colTitle={st(lang, "score.against")} ariaLabel={st(lang, "score.title")} />
                </ChartCard>

                <ChartCard title={st(lang, "roll.title")} sub={st(lang, "roll.sub")}>
                  <LineChart height={240} yTicks={[0, 1, 2, 3]} yFormat="dec" xLabel={st(lang, "roll.match")} ariaLabel={st(lang, "roll.title")}
                    series={[{ key: "ppg", tone: "navy", area: true, markers: true,
                      points: s.rollingPpg.map((r) => ({ x: r.i, y: +r.ppg.toFixed(2), result: r.x.result, tip: matchTip(r.x, `${st(lang, "m.ppg")}: ${dec(r.ppg)}`) })) }]} />
                </ChartCard>

                <ChartCard wide title={st(lang, "comp.title")} sub={st(lang, "comp.sub")}>
                  <div className="table-scroll">
                    <table className="data comp-table">
                      <thead><tr>{recordHead.map((h, i) => <th key={h} className={i ? "num" : undefined}>{h}</th>)}</tr></thead>
                      <tbody>
                        {s.byCompetition.map((c) => (
                          <tr key={c.competition} className={cx({ us: c.competition === s.league, muted: c.friendly }) || undefined}>
                            {recordRow(tr(lang, "competitions", c.competition), c.r).map((v, i) => <td key={i} className={i ? "num" : undefined}>{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                {table.length > 0 && (
                  <>
                    <ChartCard wide title={st(lang, "attack.title")} sub={st(lang, "attack.sub", { league })} tableLabel={st(lang, "data")}
                      table={{ caption: st(lang, "attack.title"), head: [st(lang, "col.team"), st(lang, "col.gf"), st(lang, "col.ga"), st(lang, "col.gd")],
                        rows: table.map((r) => [team(r.team), r.goals_for, r.goals_against, signed(r.goal_diff)]) }}>
                      <ScatterChart invertY xLabel={st(lang, "attack.x")} yLabel={st(lang, "attack.y")} ariaLabel={st(lang, "attack.title")}
                        quadrants={{ topRight: st(lang, "quad.tr"), bottomLeft: st(lang, "quad.bl") }}
                        points={table.map((r) => ({
                          x: r.goals_for, y: r.goals_against, label: team(r.team), logo: r.logo, highlight: r.is_us,
                          tip: [`${r.rank}. ${team(r.team)}`, `${st(lang, "attack.x")}: ${r.goals_for}`, `${st(lang, "attack.y")}: ${r.goals_against}`, `${st(lang, "kpi.points")}: ${r.points}`],
                        }))} />
                    </ChartCard>

                    <ChartCard wide title={st(lang, "points.title")} sub={st(lang, "points.sub")}>
                      <HBars rows={table.map((r) => ({
                        key: r.team_id || r.team, label: `${r.rank}. ${team(r.team)}`, value: r.points, logo: r.logo, highlight: r.is_us,
                        note: `${st(lang, "col.gd")} ${signed(r.goal_diff)}`,
                      }))} />
                    </ChartCard>
                  </>
                )}

                {all.length > 1 && (
                  <ChartCard wide title={st(lang, "seasons.title")} sub={st(lang, "seasons.sub")} tableLabel={st(lang, "data")}
                    table={{ caption: st(lang, "seasons.title"),
                      head: [st(lang, "col.season"), st(lang, "col.league"), st(lang, "col.p"), st(lang, "col.w"), st(lang, "col.d"), st(lang, "col.l"), st(lang, "col.gf"), st(lang, "col.ga"), st(lang, "col.pts"), st(lang, "col.ppg")],
                      rows: all.map((y) => { const o = bySeason.get(y)!; return [y, tr(lang, "competitions", o.league ?? ""), o.total.p, o.total.w, o.total.d, o.total.l, o.total.gf, o.total.ga, o.total.pts, dec(o.ppg)]; }) }}>
                    <GroupedBars metrics={[
                      { label: st(lang, "m.points"), values: all.map((y) => ({ key: y, value: bySeason.get(y)!.total.pts, display: String(bySeason.get(y)!.total.pts), current: y === season })) },
                      { label: st(lang, "m.ppg"), max: 3, values: all.map((y) => ({ key: y, value: bySeason.get(y)!.ppg, display: dec(bySeason.get(y)!.ppg), current: y === season })) },
                      { label: st(lang, "m.gf"), values: all.map((y) => { const t = bySeason.get(y)!.total; return { key: y, value: per(t.gf, t.p), display: dec(per(t.gf, t.p)), current: y === season }; }) },
                      { label: st(lang, "m.ga"), values: all.map((y) => { const t = bySeason.get(y)!.total; return { key: y, value: per(t.ga, t.p), display: dec(per(t.ga, t.p)), current: y === season }; }) },
                      { label: st(lang, "m.win"), max: 1, values: all.map((y) => ({ key: y, value: bySeason.get(y)!.winRate, display: pct(bySeason.get(y)!.winRate), current: y === season })) },
                    ]} />
                  </ChartCard>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
