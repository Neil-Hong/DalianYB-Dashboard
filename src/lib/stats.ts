// Season analytics derived from the fixtures and league table. Pure functions over data the
// scraper already collects; nothing here is estimated.
import { fixturesBySeason, seasons, standings, currentSeason, type Match, type Team } from "./data";

export const FRIENDLY = "友谊赛";

export interface Played {
  m: Match;
  gf: number;
  ga: number;
  pts: number;
  result: "W" | "D" | "L";
  home: boolean;
  opp: Team;
  round: number | null;
}

export interface Record3 { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

const empty = (): Record3 => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

function add(r: Record3, x: Played) {
  r.p++; r.gf += x.gf; r.ga += x.ga; r.pts += x.pts;
  if (x.result === "W") r.w++; else if (x.result === "D") r.d++; else r.l++;
  return r;
}
export const tally = (list: Played[]) => list.reduce(add, empty());

/** Matches that have a final score, from our point of view. */
export function playedIn(season: string): Played[] {
  return (fixturesBySeason[season] ?? [])
    .filter((m) => m.status === "played" && m.score?.home != null && m.score?.away != null && m.result)
    .map((m) => {
      const home = m.venue === "home";
      const gf = (home ? m.score!.home : m.score!.away) as number;
      const ga = (home ? m.score!.away : m.score!.home) as number;
      const result = m.result!;
      return {
        m, gf, ga, result, home,
        pts: result === "W" ? 3 : result === "D" ? 1 : 0,
        opp: home ? m.away : m.home,
        round: m.round && /^\d+$/.test(m.round) ? Number(m.round) : null,
      };
    });
}

/** The season's league: the competition with the most matches (中甲 in 2024, 中超 since). */
export function leagueOf(season: string): string | null {
  const counts = new Map<string, number>();
  for (const m of fixturesBySeason[season] ?? []) {
    if (m.competition === FRIENDLY) continue;
    counts.set(m.competition, (counts.get(m.competition) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function longestRun(list: Played[], ok: (x: Played) => boolean) {
  let best = 0, cur = 0;
  for (const x of list) { cur = ok(x) ? cur + 1 : 0; best = Math.max(best, cur); }
  return best;
}

const margin = (x: Played) => x.gf - x.ga;

export interface SeasonStats {
  season: string;
  league: string | null;
  leagueMatches: Played[];
  official: Played[];           // everything except friendlies
  all: Played[];
  total: Record3;               // league
  home: Record3;
  away: Record3;
  cleanSheets: number;
  failedToScore: number;
  winRate: number;              // 0..1, league
  ppg: number;
  biggestWin: Played | null;    // official matches
  heaviestLoss: Played | null;
  unbeatenRun: number;          // league
  winningRun: number;
  /** in the order matches were played (n = 1..); rescheduled games mean round numbers can run out of order */
  cumulative: { n: number; pts: number; x: Played }[];
  rollingPpg: { i: number; ppg: number; x: Played }[];   // 5-match window, league
  scorelines: number[][];       // [gf 0..4+][ga 0..4+], league
  byCompetition: { competition: string; friendly: boolean; r: Record3 }[];
  form: Played[];               // last 10 official, oldest first
  position: number | null;      // only when the league table for this season exists
}

const cap = (n: number) => Math.min(n, 4);

export function seasonStats(season: string): SeasonStats {
  const all = playedIn(season);
  const league = leagueOf(season);
  const leagueMatches = all.filter((x) => x.m.competition === league);
  const official = all.filter((x) => x.m.competition !== FRIENDLY);
  const total = tally(leagueMatches);

  let running = 0;
  const cumulative = leagueMatches.map((x, i) => ({ n: i + 1, pts: (running += x.pts), x }));
  const rollingPpg = leagueMatches.map((x, i) => {
    const win = leagueMatches.slice(Math.max(0, i - 4), i + 1);
    return { i: i + 1, ppg: win.reduce((s, y) => s + y.pts, 0) / win.length, x };
  });

  const scorelines = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);
  for (const x of leagueMatches) scorelines[cap(x.gf)][cap(x.ga)]++;

  const comps = new Map<string, Record3>();
  for (const x of all) comps.set(x.m.competition, add(comps.get(x.m.competition) ?? empty(), x));
  const byCompetition = [...comps].map(([competition, r]) => ({ competition, friendly: competition === FRIENDLY, r }))
    .sort((a, b) => Number(a.friendly) - Number(b.friendly) || b.r.p - a.r.p);

  const best = (pick: (a: Played, b: Played) => boolean, filter: (x: Played) => boolean) =>
    official.filter(filter).reduce<Played | null>((acc, x) => (!acc || pick(x, acc) ? x : acc), null);

  return {
    season, league, leagueMatches, official, all, total,
    home: tally(leagueMatches.filter((x) => x.home)),
    away: tally(leagueMatches.filter((x) => !x.home)),
    cleanSheets: leagueMatches.filter((x) => x.ga === 0).length,
    failedToScore: leagueMatches.filter((x) => x.gf === 0).length,
    winRate: total.p ? total.w / total.p : 0,
    ppg: total.p ? total.pts / total.p : 0,
    biggestWin: best((a, b) => margin(a) > margin(b) || (margin(a) === margin(b) && a.gf > b.gf), (x) => x.result === "W"),
    heaviestLoss: best((a, b) => margin(a) < margin(b) || (margin(a) === margin(b) && a.ga > b.ga), (x) => x.result === "L"),
    unbeatenRun: longestRun(leagueMatches, (x) => x.result !== "L"),
    winningRun: longestRun(leagueMatches, (x) => x.result === "W"),
    cumulative, rollingPpg, scorelines, byCompetition,
    form: official.slice(-10),
    position: season === currentSeason ? standings.find((r) => r.is_us)?.rank ?? null : null,
  };
}

export const statSeasons = seasons.filter((s) => playedIn(s).length > 0);
export const leagueTable = (season: string) => (season === currentSeason ? standings : []);
