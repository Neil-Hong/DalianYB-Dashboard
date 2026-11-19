import fs from "node:fs";
import path from "node:path";
import club from "../../data/club.json";
import meta from "../../data/generated/meta.json";
import squadFile from "../../data/generated/squad.json";

export type Position = "attacker" | "midfielder" | "defender" | "goalkeeper";

export interface Team { id: string; name: string; logo: string | null }
export interface Match {
  id: string;
  kickoff: string | null;
  time_confirmed: boolean;
  competition: string;
  competition_id: string;
  round: string | null;
  status: string;
  venue: "home" | "away";
  home: Team;
  away: Team;
  score: { home: number | null; away: number | null } | null;
  penalties: { home: number | null; away: number | null } | null;
  result: "W" | "D" | "L" | null;
}
export interface StandingRow {
  rank: number; team_id: string; team: string; logo: string | null;
  played: number; won: number; drawn: number; lost: number;
  goals_for: number; goals_against: number; goal_diff: number; points: number; is_us: boolean;
}
export interface Player {
  id: string; name_zh: string; name_en: string | null; nationality: string | null;
  age: number | null; photo: string | null; number: number | null; position: Position;
  u21: boolean; captain: boolean; market_value_eur: number | null;
  season_stats: Record<string, number | null>;
  birth_date?: string; height?: number; foot?: string;
  links: Record<string, string | null>;
}
export interface Staff {
  id: string; name_zh: string; name_en: string | null; nationality: string | null;
  age: number | null; photo: string | null; group: "coach" | "manager"; role: string;
}
/** Dongqiudi's own rating (能力值); never computed or estimated here. */
export interface Ability {
  overall: number;
  attributes: { key: string; label_zh: string; value: number }[];
  stars: { reputation?: number; weak_foot?: number; skill_moves?: number };
}
export interface Transfer {
  date: string; from: string | null; to: string | null; type: string | null;
  from_logo?: string | null; to_logo?: string | null; fee?: string | null; fee_eur?: number | null;
}

export interface PlayerProfile extends Player {
  weight?: number; position_zh?: string;
  career: { season: string; club: string; apps: number | null; starts: number | null; goals: number | null; assists: number | null; yellow: number | null; red: number | null }[];
  ability?: Ability | null;
  transfers: Transfer[];
  honours: { name: string; count: number; logo?: string | null }[];
  injuries: { team: string | null; type: string; from: string | null; to: string | null }[];
}

// Data is read from disk on the server (at build time for static pages), so the files written
// by the Python scraper are picked up without any registration step.
const GENERATED = path.join(process.cwd(), "data", "generated");

/** basename (without .json) -> parsed JSON for every file in data/generated/<dir>/ */
function readDir<T>(dir: string): Record<string, T> {
  const full = path.join(GENERATED, dir);
  if (!fs.existsSync(full)) return {};
  return Object.fromEntries(
    fs.readdirSync(full)
      .filter((f) => f.endsWith(".json"))
      .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(full, f), "utf-8")) as T]),
  );
}

const fixtureFiles = readDir<Match[]>("fixtures");
const standingFiles = readDir<StandingRow[]>("standings");
const profileFiles = readDir<PlayerProfile>("players");

export { club, meta };
export const squad = squadFile as unknown as { season: string; staff: Staff[]; players: Player[] };
export const currentSeason: string = meta.current_season;

export const fixturesBySeason: Record<string, Match[]> = Object.fromEntries(
  Object.entries(fixtureFiles).map(([season, m]) => [season, [...m].sort(byKickoff)]),
);
export const seasons = Object.keys(fixturesBySeason).sort().reverse();

export const standings: StandingRow[] = standingFiles[`csl-${currentSeason}`] ?? [];

export const profiles: Record<string, PlayerProfile> = profileFiles;

/** Club name (as dongqiudi writes it) -> logo URL, collected from transfer records and fixtures. */
export const clubLogos: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const m of Object.values(fixturesBySeason).flat()) {
    for (const side of [m.home, m.away]) if (side.logo && side.name) map[side.name] ??= side.logo;
  }
  for (const p of Object.values(profiles)) {
    for (const t of p.transfers) {
      if (t.from && t.from_logo) map[t.from] ??= t.from_logo;
      if (t.to && t.to_logo) map[t.to] ??= t.to_logo;
    }
  }
  if (club.logo) map[club.name_zh] = club.logo;
  return map;
})();

function byKickoff(a: Match, b: Match) {
  return (a.kickoff ?? "").localeCompare(b.kickoff ?? "");
}

export const LEAGUE = club.league_short; // "中超"

export function currentFixtures() {
  return fixturesBySeason[currentSeason] ?? [];
}

export function nextMatch(): Match | undefined {
  const now = new Date().toISOString();
  return Object.values(fixturesBySeason).flat().sort(byKickoff)
    .find((m) => m.status !== "played" && (m.kickoff ?? "") >= now.slice(0, 10));
}

export function playedMatches(season = currentSeason) {
  return (fixturesBySeason[season] ?? []).filter((m) => m.status === "played");
}

export function opponent(m: Match): Team {
  return m.venue === "home" ? m.away : m.home;
}

/** League season is complete and we finished top. */
export function isChampion(): boolean {
  if (!standings.length) return false;
  const us = standings.find((r) => r.is_us);
  const rounds = (standings.length - 1) * 2;
  return !!us && us.rank === 1 && standings.every((r) => r.played === rounds);
}

export const POSITIONS: { key: Position; zh: string; en: string }[] = [
  { key: "goalkeeper", zh: "门将", en: "Goalkeepers" },
  { key: "defender", zh: "后卫", en: "Defenders" },
  { key: "midfielder", zh: "中场", en: "Midfielders" },
  { key: "attacker", zh: "前锋", en: "Forwards" },
];
export const positionName = (lang: "en" | "zh", p: Position) => {
  const pos = POSITIONS.find((x) => x.key === p);
  return pos ? (lang === "zh" ? pos.zh : pos.en.replace(/s$/, "")) : p;
};
/** Player / staff display name in the given language. */
export const personName = (lang: "en" | "zh", p: { name_zh: string; name_en: string | null }) =>
  lang === "zh" ? p.name_zh : p.name_en ?? p.name_zh;
