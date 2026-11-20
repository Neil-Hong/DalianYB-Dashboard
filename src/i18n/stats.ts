// UI strings for the Stats page (kept apart from the main dictionary, which is already long).
import type { Lang } from "./index";

const en = {
  eyebrow: "Stats & analytics",
  title: "{season} season in numbers",
  leagueNote: "League figures are for the {league}. Cups and friendlies are counted separately.",
  empty: "No matches have been played this season yet.",
  data: "View data",
  "kpi.position": "League position", "kpi.played": "League matches", "kpi.points": "Points", "kpi.wdl": "W / D / L",
  "kpi.goals": "Goals for / against", "kpi.gd": "Goal difference", "kpi.clean": "Clean sheets", "kpi.winRate": "Win rate", "kpi.ppg": "Points per game",
  "race.title": "Points race", "race.sub": "Cumulative league points, match by match, against previous seasons", "race.round": "Round",
  "race.points": "{n} pts",
  "form.title": "Form", "form.sub": "Last 10 competitive matches, oldest first",
  "form.unbeaten": "Longest unbeaten run", "form.winning": "Longest winning run",
  "form.bigWin": "Biggest win", "form.bigLoss": "Heaviest defeat", "form.matches": "{n} league matches",
  "goals.title": "Goals per match", "goals.sub": "League matches in the order played: scored above the line, conceded below",
  "goals.for": "Scored", "goals.against": "Conceded",
  "ha.title": "Home vs away", "ha.sub": "League matches", "ha.home": "Home", "ha.away": "Away",
  "ha.ppg": "Points per game", "ha.winRate": "Win rate", "ha.gf": "Scored per game", "ha.ga": "Conceded per game", "ha.cs": "Clean sheets",
  "score.title": "Scorelines", "score.sub": "How often each league result happened",
  "score.for": "Goals scored", "score.against": "Goals conceded", "score.tip": "{n} matches",
  "roll.title": "Rolling form", "roll.sub": "Points per game across the last 5 league matches", "roll.match": "League match",
  "comp.title": "By competition", "comp.sub": "Every match this season, friendlies included",
  "attack.title": "Attack vs defence", "attack.sub": "Goals scored and conceded by every {league} team",
  "attack.x": "Goals scored", "attack.y": "Goals conceded",
  "quad.tr": "Strong attack, tight defence", "quad.bl": "Weak attack, leaky defence",
  "points.title": "League points", "points.sub": "Final table, with goal difference",
  "seasons.title": "Season comparison", "seasons.sub": "League campaigns side by side",
  "m.points": "Points", "m.ppg": "Points per game", "m.gf": "Scored per game", "m.ga": "Conceded per game", "m.win": "Win rate",
  "col.season": "Season", "col.league": "League", "col.comp": "Competition", "col.round": "Round", "col.date": "Date",
  "col.opp": "Opponent", "col.venue": "Venue", "col.score": "Score", "col.pts": "Pts", "col.total": "Total",
  "col.p": "P", "col.w": "W", "col.d": "D", "col.l": "L", "col.gf": "GF", "col.ga": "GA", "col.ppg": "PPG", "col.team": "Team", "col.gd": "GD",
  W: "Win", D: "Draw", L: "Loss",
  "tip.round": "Round {n} · {date}", "tip.vs": "{venue} vs {opp}",
};

type Key = keyof typeof en;

const zh: Record<Key, string> = {
  eyebrow: "数据分析",
  title: "{season} 赛季数据",
  leagueNote: "联赛数据为{league}；杯赛与友谊赛单独统计。",
  empty: "本赛季暂无比赛数据。",
  data: "查看数据",
  "kpi.position": "联赛排名", "kpi.played": "联赛场次", "kpi.points": "积分", "kpi.wdl": "胜 / 平 / 负",
  "kpi.goals": "进球 / 失球", "kpi.gd": "净胜球", "kpi.clean": "零封", "kpi.winRate": "胜率", "kpi.ppg": "场均积分",
  "race.title": "积分走势", "race.sub": "逐场累计联赛积分，并与往季对比", "race.round": "轮次",
  "race.points": "{n} 分",
  "form.title": "近期状态", "form.sub": "最近 10 场正式比赛（由远及近）",
  "form.unbeaten": "最长不败", "form.winning": "最长连胜",
  "form.bigWin": "最大比分胜利", "form.bigLoss": "最大比分失利", "form.matches": "联赛 {n} 场",
  "goals.title": "每场进失球", "goals.sub": "联赛（按比赛先后）：横线上方为进球，下方为失球",
  "goals.for": "进球", "goals.against": "失球",
  "ha.title": "主客场对比", "ha.sub": "联赛", "ha.home": "主场", "ha.away": "客场",
  "ha.ppg": "场均积分", "ha.winRate": "胜率", "ha.gf": "场均进球", "ha.ga": "场均失球", "ha.cs": "零封",
  "score.title": "比分分布", "score.sub": "联赛各比分出现次数",
  "score.for": "进球", "score.against": "失球", "score.tip": "{n} 场",
  "roll.title": "状态曲线", "roll.sub": "最近 5 场联赛的场均积分", "roll.match": "联赛场次",
  "comp.title": "分赛事", "comp.sub": "本赛季全部比赛（含友谊赛）",
  "attack.title": "攻防对比", "attack.sub": "{league}各队进球与失球",
  "attack.x": "进球", "attack.y": "失球",
  "quad.tr": "攻强守稳", "quad.bl": "攻弱守漏",
  "points.title": "联赛积分", "points.sub": "最终积分榜与净胜球",
  "seasons.title": "赛季对比", "seasons.sub": "各赛季联赛表现",
  "m.points": "积分", "m.ppg": "场均积分", "m.gf": "场均进球", "m.ga": "场均失球", "m.win": "胜率",
  "col.season": "赛季", "col.league": "联赛", "col.comp": "赛事", "col.round": "轮次", "col.date": "日期",
  "col.opp": "对手", "col.venue": "主客", "col.score": "比分", "col.pts": "积分", "col.total": "合计",
  "col.p": "赛", "col.w": "胜", "col.d": "平", "col.l": "负", "col.gf": "进", "col.ga": "失", "col.ppg": "场均", "col.team": "球队", "col.gd": "净胜",
  W: "胜", D: "平", L: "负",
  "tip.round": "第 {n} 轮 · {date}", "tip.vs": "{venue} 对 {opp}",
};

export type StatsKey = Key;

export function st(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const s = (lang === "zh" ? zh : en)[key] ?? en[key];
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
