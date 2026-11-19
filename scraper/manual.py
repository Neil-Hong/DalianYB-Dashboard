"""Manual data updates: you save pages in your browser, this script sorts and builds them.

    python scraper/manual.py checklist   # write inbox/checklist.html with every link to save
    python scraper/manual.py import      # sort files saved in inbox/, rebuild data/generated/

Workflow:
  1. Run `checklist`, open inbox/checklist.html in your browser.
  2. Open each link and save it (Ctrl+S) into the inbox/ folder. File names don't matter.
  3. Run `import`. Files are recognised by content, stored in scraper/saved/ under fixed
     names, and the originals are moved to inbox/_imported/<date>/.

scraper/saved/ keeps the latest copy of every page, so player pages only need saving once
(and again when you want their career/transfer history refreshed).
"""

from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import news  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "inbox"
SAVED = Path(__file__).resolve().parent / "saved"
GENERATED = ROOT / "data" / "generated"

BASE = "https://www.dongqiudi.com"
TEAM_ID = "122423"
SQUAD_URL = f"{BASE}/sport-data/soccer/biz/dqd/v1/team/member_v2/{TEAM_ID}?app=dqd"
SCHEDULE_URL = f"{BASE}/sport-data/soccer/biz/dqd/v1/team/schedule/{TEAM_ID}?app=dqd"
STANDINGS_URL = f"{BASE}/data?cid=43&tab=standings"
TEAM_URL = f"{BASE}/team/{TEAM_ID}"


# ---------------------------------------------------------------- recognising files

def _read(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "gb18030"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _as_json(text: str):
    s = text.strip()
    if s.startswith("<"):  # some browsers wrap raw JSON in <pre> when saving
        m = re.search(r"<pre[^>]*>(.*?)</pre>", s, re.S)
        if not m:
            return None
        s = html.unescape(m.group(1)).strip()
    if not s.startswith("{"):
        return None
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return None


def _strip_u21(name: str) -> str:
    return re.sub(r"\s*[（(]U21[）)]", "", name or "").strip()


def _squad_lookup() -> tuple[dict[str, str], dict[str, str]]:
    """(name_zh -> id, photo url -> id) from the latest saved squad, for identifying player pages."""
    path = SAVED / "squad.json"
    if not path.exists():
        return {}, {}
    data = json.loads(path.read_text(encoding="utf-8"))
    names, photos = {}, {}
    for group in data["data"]["list"]:
        for p in group["data"]:
            names[_strip_u21(p.get("person_name", ""))] = p["person_id"]
            if p.get("person_logo"):  # keyed by file name: "Webpage, Complete" saves rewrite the URL
                photos[p["person_logo"].rsplit("/", 1)[-1]] = p["person_id"]
    return names, photos


def _player_id(text: str) -> str | None:
    # 1. literal id in the embedded page data (absent when Nuxt shortens it to a variable)
    m = re.search(r'base_info:\{person_id:"(\d+)"', text) or re.search(r'"base_info":\{"person_id":"(\d+)"', text)
    if m:
        return m.group(1)
    names, photos = _squad_lookup()
    # 2. hero photo URL, which matches the squad's person_logo
    m = re.search(r'<img[^>]*class="pp-hero__avatar"[^>]*src="([^"]+)"', text) or \
        re.search(r'<img[^>]*src="([^"]+)"[^>]*class="pp-hero__avatar"', text)
    if m and m.group(1).rsplit("/", 1)[-1] in photos:
        return photos[m.group(1).rsplit("/", 1)[-1]]
    # 3. name in the <title>, e.g. "孙康博(U21) - 懂球帝"
    title = re.search(r"<title[^>]*>([^<]+?)\s*-\s*懂球帝", text)
    return names.get(_strip_u21(title.group(1))) if title else None


NEWS = "__news__"  # not stored in saved/: merged straight into data/news.json


def identify(path: Path) -> tuple[str | None, str]:
    """Return (canonical file name, description) or (None, reason)."""
    text = _read(path)
    data = _as_json(text)

    if news.is_news_feed(data):
        return NEWS, "news feed"
    if data is None and news.is_team_news_page(text):
        return NEWS, "team page news"

    if isinstance(data, dict):
        if "team_seasons" in data and "schedules" in data:
            years = [m.get("start_play", "")[:4] for m in data["schedules"] if m.get("competition_name") != "友谊赛"]
            year = max(set(years), key=years.count) if years else None
            season = next((s for s in data["team_seasons"] if s["season_name"] == year), None)
            if season is None:
                return None, "schedule JSON, but could not tell which season"
            if season.get("current") == 1:
                return "schedule.json", f"fixtures {year} (current)"
            return f"schedule-{season['season_id']}.json", f"fixtures {year}"
        lst = (data.get("data") or {}).get("list") if isinstance(data.get("data"), dict) else None
        if isinstance(lst, list) and any(g.get("type") == "goalkeeper" for g in lst):
            return "squad.json", "squad"
        return None, "unrecognised JSON"

    if "dp-table" in text and "dp-row" in text:
        active = re.search(r'dp-league-item--active[^>]*>.*?dp-league-item__name[^>]*>([^<]+)<', text, re.S)
        name = active.group(1).strip() if active else ""
        if name and name != "中超":
            return None, f"standings for {name}, not 中超"
        return "standings-43.html", "中超 standings"

    if "pp-info-row" in text or "pp-hero" in text:
        pid = _player_id(text)
        if not pid:
            return None, "player page, but could not find the player id (save the squad first)"
        return f"player-{pid}.html", f"player {pid}"

    return None, "not a recognised dongqiudi page"


# ---------------------------------------------------------------- commands

def cmd_import() -> None:
    INBOX.mkdir(exist_ok=True)
    SAVED.mkdir(exist_ok=True)
    files = [p for p in INBOX.iterdir() if p.is_file() and p.suffix.lower() in (".json", ".html", ".htm", ".txt")
             and p.name != "checklist.html"]
    # squad first, so player pages can fall back to name matching
    files.sort(key=lambda p: 0 if identify(p)[0] == "squad.json" else 1)
    if not files:
        print(f"inbox is empty: save pages into {INBOX}")
        return

    done_dir = INBOX / "_imported" / date.today().isoformat()
    imported = 0
    news_items: list[dict] = []
    for path in files:
        target, desc = identify(path)
        if not target:
            print(f"  skip  {path.name}: {desc}")
            continue
        if target == NEWS:
            text = _read(path)
            data = _as_json(text)
            items = news.parse_feed(data) if data is not None else news.parse_team_page(text)
            news_items += items
            desc = f"{desc}: {len(items)} items"
        else:
            SAVED.joinpath(target).write_text(_read(path), encoding="utf-8")
        done_dir.mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), done_dir / path.name)
        print(f"  ok    {path.name} -> {desc}")
        imported += 1

    # Chrome "Webpage, Complete" leaves *_files folders next to the page; they are not needed
    for folder in INBOX.glob("*_files"):
        if folder.is_dir() and done_dir.exists():
            shutil.move(str(folder), done_dir / folder.name)

    if news_items:
        r = news.merge(news_items)
        print(f"news: {r['added']} new, {r['updated']} updated, {r['total']} in archive")
        if r["gap"]:
            print(f"  ! possible gap: oldest saved item is {r['oldest_new'][:16]}, archive's newest was "
                  f"{r['newest_before'][:16]}. Scroll further down the 资讯 tab and save again.")

    if not imported:
        return
    if not (SAVED / "squad.json").exists() or not (SAVED / "schedule.json").exists():
        print("need at least squad and current fixtures before building; see checklist")
        return
    print("building ...")
    subprocess.run([sys.executable, str(Path(__file__).parent / "build.py"), "--snapshot", str(SAVED)], check=True)
    cmd_checklist(quiet=True)


def cmd_checklist(quiet: bool = False) -> None:
    INBOX.mkdir(exist_ok=True)
    have = {p.name for p in SAVED.glob("*")} if SAVED.exists() else set()

    seasons = []
    if (SAVED / "schedule.json").exists():
        sched = json.loads((SAVED / "schedule.json").read_text(encoding="utf-8"))
        seasons = [s for s in sched["team_seasons"] if s.get("current") != 1]

    players = []
    if (SAVED / "squad.json").exists():
        squad = json.loads((SAVED / "squad.json").read_text(encoding="utf-8"))
        for g in squad["data"]["list"]:
            if g["type"] in ("coach", "manager"):
                continue
            for p in g["data"]:
                players.append((p.get("shirtnumber") or "", re.sub(r"\s*[（(]U21[）)]", "", p["person_name"]), p["person_id"]))
        players.sort(key=lambda x: int(x[0]) if str(x[0]).isdigit() else 999)

    def row(url: str, label: str, saved: bool, note: str = "") -> str:
        cls = "done" if saved else "todo"
        mark = "已保存" if saved else "待保存"
        return (f'<li class="{cls}"><a href="{html.escape(url)}" target="_blank" rel="noopener">{html.escape(label)}</a>'
                f'<span class="mark">{mark}</span>{f"<small>{html.escape(note)}</small>" if note else ""}</li>')

    latest_news = max((i["published_at"] or "" for i in news.load_archive()), default="")
    weekly = [
        row(TEAM_URL, "球队资讯 (news)", False,
            f"在「资讯」中向下滚动到 {latest_news[:10] or '上周'} 之前，再按 Ctrl+S 选「网页，全部」保存"),
        row(SQUAD_URL, "阵容 + 本赛季数据 (squad JSON)", "squad.json" in have),
        row(SCHEDULE_URL, "本赛季赛程赛果 (fixtures JSON)", "schedule.json" in have),
        row(STANDINGS_URL, "中超积分榜 (standings)", "standings-43.html" in have),
    ]
    past = [row(s["url"], f"{s['season_name']} 赛季赛程", f"schedule-{s['season_id']}.json" in have) for s in seasons]
    missing = [p for p in players if f"player-{p[2]}.html" not in have]
    player_rows = [row(f"{BASE}/player/{pid}.html", f"{num} {name}".strip(), f"player-{pid}.html" in have)
                   for num, name, pid in sorted(players, key=lambda p: f"player-{p[2]}.html" in have)]

    page = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>数据更新清单</title>
<style>
  :root {{ --line:#e3e7f0; --muted:#5d6781; }}
  body {{ font-family: "PingFang SC","Microsoft YaHei",system-ui,sans-serif; max-width: 760px; margin: 32px auto; padding: 0 16px; color:#121a2e; background:#f4f6fb; }}
  h1 {{ font-size: 24px; margin-bottom: 4px; }} h2 {{ font-size: 17px; margin: 28px 0 8px; }}
  p {{ color: var(--muted); font-size: 14px; }}
  ol {{ font-size: 14px; color: var(--muted); padding-left: 20px; }}
  code {{ background:#fff; border:1px solid var(--line); border-radius:4px; padding:1px 5px; }}
  ul {{ list-style:none; padding:0; margin:0; background:#fff; border:1px solid var(--line); border-radius:12px; }}
  li {{ display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--line); font-size:15px; }}
  li:last-child {{ border-bottom:0; }}
  li a {{ flex:1; color:#153b91; }}
  li a:visited {{ color:#7a5ea8; }}
  .mark {{ font-size:12px; padding:2px 8px; border-radius:999px; }}
  .todo .mark {{ background:#fdecec; color:#c0392b; }}
  .done .mark {{ background:#e7f6ec; color:#18a058; }}
  small {{ color: var(--muted); }}
</style></head><body>
<h1>数据更新清单</h1>
<p>{len(missing)} 名球员资料待保存 · 生成于 {date.today().isoformat()}</p>
<ol>
  <li>点击链接打开页面，按 <code>Ctrl+S</code> 保存到 <code>inbox</code> 文件夹（文件名随意）。</li>
  <li>保存完后运行 <code>npm run import</code>。</li>
</ol>
<h2>每周更新（4 个）</h2>
<ul>{''.join(weekly)}</ul>
<h2>球员资料（保存一次即可，新援加盟时补充）</h2>
<ul>{''.join(player_rows) or '<li>先保存阵容，再重新生成清单。</li>'}</ul>
{f"<h2>往季赛程（保存一次即可）</h2><ul>{''.join(past)}</ul>" if past else ""}
</body></html>
"""
    out = INBOX / "checklist.html"
    out.write_text(page, encoding="utf-8")
    if not quiet:
        print(f"wrote {out}")
        print(f"  weekly: 4 links · players missing: {len(missing)} · past seasons: {len(past)}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "import":
        cmd_import()
    elif cmd == "checklist":
        cmd_checklist()
    else:
        print(__doc__)
