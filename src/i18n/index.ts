import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export type Lang = "en" | "zh";
export const LANGS: Lang[] = ["en", "zh"];
export const DEFAULT_LANG: Lang = "en";

// ---------------------------------------------------------------- paths

/** "/squad" -> "/squad" (en) or "/zh/squad" (zh) */
export function href(lang: Lang, p: string): string {
  if (lang === DEFAULT_LANG) return p;
  return p === "/" ? "/zh" : `/zh${p}`;
}
/** Current path in the other language. */
export function switchHref(pathname: string, to: Lang): string {
  const bare = pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
  return href(to, bare);
}

// ---------------------------------------------------------------- data translations

type Dict = Record<string, Record<string, string>>;
let dict: Dict | null = null;
const missing = new Map<string, Set<string>>();

function load(): Dict {
  if (!dict) {
    try {
      const text = fs.readFileSync(path.join(process.cwd(), "data", "translations.yaml"), "utf-8");
      dict = (parse(text) as Dict) ?? {};
    } catch {
      dict = {};
    }
  }
  return dict;
}

function lookup(category: string, zh: string): string | undefined {
  return load()[category]?.[zh];
}

function note(category: string, zh: string) {
  if (!missing.has(category)) missing.set(category, new Set());
  missing.get(category)!.add(zh);
}
export function missingTranslations() {
  return missing;
}

const CLUB_SUFFIXES: [RegExp, string][] = [
  [/(U\d{2})$/, " $1"],
  [/预备队$/, " Reserves"],
  [/青年队$/, " Youth"],
  [/B队$/, " B"],
  [/二队$/, " B"],
];

/** Translate a data string. Falls back to the original (and records it as missing). */
export function tr(lang: Lang, category: string, zh: string | null | undefined): string {
  if (!zh) return "";
  if (lang === "zh") return zh;
  if (/^[\x00-\x7FÀ-ɏ\s]+$/.test(zh)) return zh; // already Latin

  const direct = lookup(category, zh);
  if (direct) return direct;

  if (category === "nationalities" && zh.includes("/")) {
    return zh.split("/").map((p) => tr(lang, category, p)).join(" / ");
  }
  if (category === "teams" || category === "clubs") {
    const other = lookup(category === "teams" ? "clubs" : "teams", zh);
    if (other) return other;
    for (const [re, suffix] of CLUB_SUFFIXES) {
      if (re.test(zh)) {
        const base = zh.replace(re, "");
        const baseEn = lookup("clubs", base) ?? lookup("teams", base);
        if (baseEn) return baseEn + zh.match(re)![0].replace(re, suffix);
      }
    }
  }
  note(category, zh);
  return zh;
}

/** "转会 （400万欧）" -> "Transfer (€4M)" */
export function trTransfer(lang: Lang, type: string | null): string {
  if (!type || type === "?") return "";
  if (lang === "zh") return type;
  const kinds: [string, string][] = [["租借回归", "End of loan"], ["租借", "Loan"], ["免签", "Free transfer"], ["转会", "Transfer"]];
  const kind = kinds.find(([k]) => type.startsWith(k));
  const fee = type.match(/([\d.]+)\s*万欧/);
  let out = kind ? kind[1] : type;
  if (fee) {
    const eur = parseFloat(fee[1]) * 10_000;
    out += ` (€${eur >= 1_000_000 ? `${+(eur / 1_000_000).toFixed(2)}M` : `${Math.round(eur / 1000)}K`})`;
  }
  return out;
}

// ---------------------------------------------------------------- formatting

const TZ = "Asia/Shanghai";
const locale = (lang: Lang) => (lang === "zh" ? "zh-CN" : "en-GB");
const fmt = (lang: Lang, iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(lang), { timeZone: TZ, ...opts }).format(new Date(iso));

export const fmtDate = (lang: Lang, iso: string | null) =>
  iso ? fmt(lang, iso, lang === "zh" ? { month: "numeric", day: "numeric" } : { day: "numeric", month: "short" }) : t(lang, "tbd");
export const fmtFullDate = (lang: Lang, iso: string | null) =>
  iso ? fmt(lang, iso, { year: "numeric", month: "long", day: "numeric", weekday: "short" }) : t(lang, "tbd");
export const fmtTime = (lang: Lang, iso: string | null, confirmed = true) =>
  iso && confirmed ? fmt(lang, iso, { hour: "2-digit", minute: "2-digit", hour12: false }) : t(lang, "tbd");
export const fmtMonth = (lang: Lang, iso: string | null) =>
  iso ? fmt(lang, iso, { year: "numeric", month: "long" }) : t(lang, "tbd");
export const fmtDay = (lang: Lang, iso: string) => fmt(lang, iso, { month: "long", day: "numeric", weekday: "short" });
export const fmtDateTime = (lang: Lang, iso: string | null) =>
  iso ? fmt(lang, iso, { month: lang === "zh" ? "numeric" : "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
export const fmtUpdated = (lang: Lang, iso: string) => fmt(lang, iso, { dateStyle: "medium", timeStyle: "short" });
/** "2026-11" -> "November 2026" / "2026年11月" */
export const fmtYearMonth = (lang: Lang, ym: string) =>
  lang === "zh" ? `${ym.slice(0, 4)}年${Number(ym.slice(5))}月` : fmt(lang, `${ym}-15T12:00:00+08:00`, { year: "numeric", month: "long" });

// ---------------------------------------------------------------- UI strings

const ui = {
  en: {
    "nav.home": "Home", "nav.news": "News", "nav.fixtures": "Fixtures", "nav.table": "Table", "nav.squad": "Squad", "nav.gallery": "Gallery", "nav.stats": "Stats",
    "gallery.title": "Gallery", "gallery.description": "Dalian Yingbo in pictures: the stadium, the supporters, the tifo and the title-winning season.",
    "gallery.stadium": "Stadium", "gallery.supporters": "Supporters", "gallery.tifo": "Tifo", "gallery.champion": "Champions",
    "gallery.hint": "Scroll or drag", "gallery.open": "Open", "gallery.back": "Gallery", "gallery.photos": "{n} photographs",
    "gallery.next": "Next exhibition", "gallery.close": "Close", "gallery.prev": "Previous photo", "gallery.nextPhoto": "Next photo",
    "gallery.photoAlt": "{cat}, photo {n} of {total}",
    "site.description": "Dalian Yingbo fan site: fixtures, league table, squad and player stats.",
    "footer.unofficial": "Unofficial fan site. Not affiliated with Dalian Yingbo FC.",
    "footer.source": "Data from", "footer.updated": "Updated",
    tbd: "TBD", home: "Home", away: "Away", homeShort: "H", awayShort: "A", vs: "vs",
    W: "W", D: "D", L: "L", pens: "Pens", round: "Round {n}", years: "{n}", age: "Age {n}",
    "home.season": "{season} season · {league}", "home.champion": "{season} Chinese Super League champions",
    "home.rank": "Position", "home.points": "Points", "home.wdl": "W / D / L", "home.goals": "Goals for / against",
    "home.next": "Next match", "home.homeAt": "Home · {stadium}", "home.away": "Away",
    "home.news": "Latest news", "home.moreNews": "More news →",
    "home.recent": "Recent results", "home.allFixtures": "All fixtures →",
    "home.stats": "{season} player stats", "home.fullSquad": "Full squad →",
    "home.scorers": "Top scorers", "home.assists": "Assists", "home.apps": "Appearances",
    "home.table": "CSL table", "home.fullTable": "Full table →", "home.form": "League form",
    "home.club": "Club", "home.founded": "Founded", "home.city": "City", "home.stadium": "Stadium",
    "home.capacity": "Capacity", "home.coach": "Head coach", "home.seats": "{n} seats",
    "table.title": "{season} CSL table", "table.team": "Team", "table.p": "P", "table.w": "W", "table.d": "D", "table.l": "L",
    "table.gfga": "GF/GA", "table.gd": "GD", "table.pts": "Pts", "table.empty": "No table data yet.",
    "fixtures.title": "{season} fixtures & results", "fixtures.eyebrow": "Fixtures & Results", "fixtures.all": "All",
    "fixtures.empty": "No data for this season.", "fixtures.record": "{w}W {d}D {l}L",
    "squad.title": "{season} squad", "squad.eyebrow": "First team squad", "squad.players": "Players",
    "squad.foreign": "Foreign", "squad.avgAge": "Average age", "squad.value": "Squad value", "squad.staff": "Coaching staff",
    "stat.apps": "Apps", "stat.goals": "Goals", "stat.assists": "Assists", "stat.saves": "Saves", "stat.clearances": "Clearances",
    "stat.clearancesShort": "Clr.",
    "stat.season": "Season {label}",
    "player.info": "Player info", "player.position": "Position", "player.number": "Number", "player.nationality": "Nationality",
    "player.born": "Born", "player.age": "Age", "player.height": "Height", "player.weight": "Weight", "player.foot": "Foot",
    "player.value": "Market value", "player.source": "Dongqiudi profile ↗", "player.pending": "Career, transfer and honours data will appear after the next data update.",
    "player.career": "Career", "player.careerTotal": "{apps} apps · {goals} goals · {assists} assists",
    "player.season": "Season", "player.club": "Club", "player.starts": "Starts", "player.yellow": "YC", "player.red": "RC",
    "player.transfers": "Transfers", "player.honours": "Honours", "player.injuries": "Injury history", "player.captain": "Captain",
    "player.ability": "Overall rating", "player.abilityNote": "Rating by Dongqiudi", "player.abilityNone": "No rating on Dongqiudi yet. It will appear here once one is published.",
    "player.viewMore": "View all {n}", "player.close": "Close", "player.showing": "Latest {n} of {total}",
    "player.fee": "Fee", "player.date": "Date", "player.from": "From", "player.to": "To", "player.timesWon": "{n}× winner",
    "ability.pace": "Pace", "ability.physical": "Physical", "ability.defending": "Defending", "ability.dribbling": "Dribbling",
    "ability.passing": "Passing", "ability.shooting": "Shooting", "ability.diving": "Diving", "ability.positioning": "Positioning",
    "ability.reflexes": "Reflexes", "ability.kicking": "Kicking", "ability.handling": "Handling",
    "ability.reputation": "International reputation", "ability.weak_foot": "Weak foot", "ability.skill_moves": "Skill moves",
    "news.title": "Club news", "news.month": "News · {month}", "news.eyebrow": "Club news",
    "news.sub": "Collected weekly; headlines link to the original article on Dongqiudi. {n} items.",
    "news.zhNote": "Headlines are in Chinese, as published.",
    "news.latest": "Latest", "news.pinned": "Pinned", "news.empty": "No news yet.", "news.older": "Older news is grouped by month above ↑",
    "news.video": "Video", "news.unknownDate": "Date unknown",
  },
  zh: {
    "nav.home": "首页", "nav.news": "新闻", "nav.fixtures": "赛程", "nav.table": "积分榜", "nav.squad": "阵容", "nav.gallery": "图集", "nav.stats": "数据",
    "gallery.title": "图集", "gallery.description": "图说大连英博：球场、球迷、TIFO 与冠军时刻。",
    "gallery.stadium": "球场", "gallery.supporters": "球迷", "gallery.tifo": "TIFO", "gallery.champion": "冠军",
    "gallery.hint": "滚动或拖动", "gallery.open": "进入", "gallery.back": "图集", "gallery.photos": "{n} 张照片",
    "gallery.next": "下一个展厅", "gallery.close": "关闭", "gallery.prev": "上一张", "gallery.nextPhoto": "下一张",
    "gallery.photoAlt": "{cat}，第 {n} 张 / 共 {total} 张",
    "site.description": "大连英博球迷数据站：赛程、积分榜、阵容与球员数据。",
    "footer.unofficial": "非官方球迷站点，与大连英博足球俱乐部无隶属关系。",
    "footer.source": "数据来源", "footer.updated": "更新于",
    tbd: "待定", home: "主场", away: "客场", homeShort: "主", awayShort: "客", vs: "vs",
    W: "胜", D: "平", L: "负", pens: "点球", round: "第{n}轮", years: "{n}岁", age: "{n}岁",
    "home.season": "{season} 赛季 · {league}", "home.champion": "{season} 中超联赛冠军",
    "home.rank": "排名", "home.points": "积分", "home.wdl": "胜/平/负", "home.goals": "进/失球",
    "home.next": "下一场", "home.homeAt": "主场 · {stadium}", "home.away": "客场",
    "home.news": "最新新闻", "home.moreNews": "更多新闻 →",
    "home.recent": "近期赛果", "home.allFixtures": "全部赛程 →",
    "home.stats": "{season} 赛季球员数据", "home.fullSquad": "完整阵容 →",
    "home.scorers": "射手榜", "home.assists": "助攻榜", "home.apps": "出场榜",
    "home.table": "中超积分榜", "home.fullTable": "完整 →", "home.form": "联赛近况",
    "home.club": "俱乐部", "home.founded": "成立", "home.city": "城市", "home.stadium": "主场",
    "home.capacity": "容量", "home.coach": "主教练", "home.seats": "{n} 座",
    "table.title": "{season} 中超积分榜", "table.team": "球队", "table.p": "赛", "table.w": "胜", "table.d": "平", "table.l": "负",
    "table.gfga": "进/失", "table.gd": "净胜", "table.pts": "积分", "table.empty": "暂无积分榜数据。",
    "fixtures.title": "{season} 赛季赛程", "fixtures.eyebrow": "赛程赛果", "fixtures.all": "全部",
    "fixtures.empty": "暂无该赛季数据。", "fixtures.record": "{w}胜 {d}平 {l}负",
    "squad.title": "{season} 赛季阵容", "squad.eyebrow": "一线队阵容", "squad.players": "球员",
    "squad.foreign": "外援", "squad.avgAge": "平均年龄", "squad.value": "总身价", "squad.staff": "教练组",
    "stat.apps": "出场", "stat.goals": "进球", "stat.assists": "助攻", "stat.saves": "扑救", "stat.clearances": "解围",
    "stat.clearancesShort": "解围",
    "stat.season": "本赛季{label}",
    "player.info": "球员信息", "player.position": "位置", "player.number": "号码", "player.nationality": "国籍",
    "player.born": "生日", "player.age": "年龄", "player.height": "身高", "player.weight": "体重", "player.foot": "惯用脚",
    "player.value": "身价", "player.source": "懂球帝资料页 ↗", "player.pending": "该球员的生涯、转会与荣誉数据将在下次数据更新后显示。",
    "player.career": "职业生涯", "player.careerTotal": "共 {apps} 场 · {goals} 球 · {assists} 助攻",
    "player.season": "赛季", "player.club": "俱乐部", "player.starts": "首发", "player.yellow": "黄牌", "player.red": "红牌",
    "player.transfers": "转会记录", "player.honours": "荣誉", "player.injuries": "伤病记录", "player.captain": "队长",
    "player.ability": "综合能力", "player.abilityNote": "数据来自懂球帝", "player.abilityNone": "懂球帝暂未公布该球员的能力值，公布后将在此显示。",
    "player.viewMore": "查看全部 {n} 条", "player.close": "关闭", "player.showing": "最近 {n} 条 / 共 {total} 条",
    "player.fee": "转会费", "player.date": "日期", "player.from": "转出", "player.to": "转入", "player.timesWon": "{n} 次",
    "ability.pace": "速度", "ability.physical": "力量", "ability.defending": "防守", "ability.dribbling": "盘带",
    "ability.passing": "传球", "ability.shooting": "射门", "ability.diving": "扑救", "ability.positioning": "位置",
    "ability.reflexes": "反应", "ability.kicking": "开球", "ability.handling": "手型",
    "ability.reputation": "国际声望", "ability.weak_foot": "逆足能力", "ability.skill_moves": "花式技巧",
    "news.title": "球队新闻", "news.month": "{month}新闻", "news.eyebrow": "球队新闻",
    "news.sub": "每周整理一次，标题链接至懂球帝原文。共 {n} 条。",
    "news.zhNote": "",
    "news.latest": "最新", "news.pinned": "置顶", "news.empty": "暂无新闻。", "news.older": "更早的新闻请按月份查看 ↑",
    "news.video": "视频", "news.unknownDate": "日期未知",
  },
} as const;

export type UIKey = keyof (typeof ui)["en"];

export function t(lang: Lang, key: UIKey, vars: Record<string, string | number> = {}): string {
  const s: string = ui[lang][key] ?? ui.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
