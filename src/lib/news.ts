import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import archive from "../../data/news.json";

export interface NewsItem {
  id: string;
  title: string;
  published_at: string | null;
  thumb: string | null;
  comments: number | null;
  tags: string[];
  author?: string | null;
  video?: boolean;
  url: string;
  note?: string;
  pinned?: boolean;
}

interface Overrides { hide?: (string | number)[]; pin?: (string | number)[]; notes?: Record<string, string> }

function loadOverrides(): Overrides {
  try {
    // read from the project root: bundled build chunks don't keep their source location
    const text = fs.readFileSync(path.join(process.cwd(), "data", "news-overrides.yaml"), "utf-8");
    return (parse(text) as Overrides) ?? {};
  } catch {
    return {};
  }
}

const o = loadOverrides();
const hidden = new Set((o.hide ?? []).map(String));
const pinned = (o.pin ?? []).map(String);
const notes = Object.fromEntries(Object.entries(o.notes ?? {}).map(([k, v]) => [String(k), v]));

/** Visible news, newest first, with notes attached. */
export const news: NewsItem[] = (archive as NewsItem[])
  .filter((n) => !hidden.has(n.id))
  .map((n) => ({ ...n, note: notes[n.id], pinned: pinned.includes(n.id) }));

export const pinnedNews = pinned.map((id) => news.find((n) => n.id === id)).filter((n): n is NewsItem => !!n);

const TZ = "Asia/Shanghai";
/** "2026-11" in Beijing time */
export function monthOf(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  const y = new Intl.DateTimeFormat("en", { timeZone: TZ, year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en", { timeZone: TZ, month: "2-digit" }).format(d);
  return `${y}-${m}`;
}

export const newsMonths = [...new Set(news.map((n) => monthOf(n.published_at)))].sort().reverse();
