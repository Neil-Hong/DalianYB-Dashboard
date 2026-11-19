"""Club news from dongqiudi.com, kept as a growing archive in data/news.json.

Only headline-level data is stored (title, time, thumbnail, tags, comment count) plus a link
to the original article. Article text is never copied.

Accepted inputs (saved by hand from the browser):
  * the team page https://www.dongqiudi.com/team/122423, ideally scrolled down in the
    资讯 tab and saved as "Webpage, Complete" so every loaded item is included
  * the news feed JSON (/api/v3/archive/app/channel/feeds?id=50122423&type=team...)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "data" / "news.json"
ARTICLE_URL = "https://www.dongqiudi.com/articles/{id}.html"


def _iso_bj(value: str | None) -> str | None:
    """'2026-11-19 16:24[:31]' (Beijing time) -> '2026-11-19T16:24:31+08:00'."""
    if not value:
        return None
    m = re.match(r"(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?", value.strip())
    if not m:
        return None
    return f"{m.group(1)}T{m.group(2)}:{m.group(3) or '00'}+08:00"


def _remote(url: str | None) -> str | None:
    """Drop thumbnails that a 'Webpage, Complete' save rewrote to local files."""
    return url if url and url.startswith("http") else None


def is_team_news_page(text: str) -> bool:
    return "tp-news-item" in text


def is_news_feed(data) -> bool:
    return isinstance(data, dict) and isinstance(data.get("data"), dict) and isinstance(data["data"].get("articles"), list)


def parse_team_page(text: str) -> list[dict]:
    soup = BeautifulSoup(text, "lxml")
    # thumbnails for the first page of items are also in the embedded page data, which
    # survives when the visible <img> was rewritten to a local copy
    embedded = {m.group(1): m.group(2) for m in re.finditer(
        r'\{id:(\d+),title:"[^"]*",category:[^,]+,time:[^,]+,image:"([^"]+)"', text)}
    items = []
    for a in soup.select("a.tp-news-item"):
        m = re.search(r"/articles?/(\d+)", a.get("href", ""))
        if not m:
            continue
        aid = m.group(1)
        img = a.select_one(".tp-news-item__img")
        thumb = _remote(img.get("src") if img else None)
        if not thumb and aid in embedded:
            thumb = embedded[aid].encode().decode("unicode_escape")
        comments = re.sub(r"\D", "", a.select_one(".tp-news-item__comments").get_text() if a.select_one(".tp-news-item__comments") else "")
        tag = a.select_one(".tp-news-item__tag")
        items.append({
            "id": aid,
            "title": a.select_one(".tp-news-item__title").get_text(strip=True) if a.select_one(".tp-news-item__title") else "",
            "published_at": _iso_bj(a.select_one(".tp-news-item__time").get_text(strip=True) if a.select_one(".tp-news-item__time") else None),
            "thumb": thumb,
            "comments": int(comments) if comments else None,
            "tags": [tag.get_text(strip=True)] if tag else [],
        })
    return [i for i in items if i["title"]]


def parse_feed(data: dict) -> list[dict]:
    items = []
    for a in data["data"]["articles"]:
        if a.get("is_business_ad") or not a.get("id") or not a.get("title"):
            continue
        items.append({
            "id": str(a["id"]),
            "title": a["title"].strip(),
            "published_at": _iso_bj(a.get("published_at") or a.get("created_at")),
            "thumb": a.get("thumb") or None,
            "comments": a.get("comments_total"),
            "tags": [t for t in [a.get("category"), *(a.get("secondary_category") or [])] if t],
            "author": a.get("author_name") or None,
            "video": bool(a.get("is_video") or a.get("has_video")),
        })
    return items


def load_archive() -> list[dict]:
    if not ARCHIVE.exists():
        return []
    return json.loads(ARCHIVE.read_text(encoding="utf-8"))


def merge(new_items: list[dict]) -> dict:
    """Merge into data/news.json. Returns counts and a possible gap warning."""
    archive = load_archive()
    newest_before = max((i["published_at"] or "" for i in archive), default="")
    by_id = {i["id"]: i for i in archive}
    added = updated = 0
    for item in new_items:
        old = by_id.get(item["id"])
        if old is None:
            by_id[item["id"]] = {**item, "url": ARTICLE_URL.format(id=item["id"])}
            added += 1
        else:
            before = dict(old)
            for k, v in item.items():
                if v in (None, [], ""):
                    continue  # keep known values (e.g. a thumbnail) when the new save lacks them
                if k == "tags":
                    old[k] = list(dict.fromkeys([*(old.get(k) or []), *v]))
                elif k == "comments":
                    old[k] = max(old.get(k) or 0, v)
                elif k == "published_at" and old.get(k) and old[k][:16] == v[:16]:
                    old[k] = max(old[k], v)  # same minute: keep the one with seconds
                else:
                    old[k] = v
            updated += old != before
    merged = sorted(by_id.values(), key=lambda i: i["published_at"] or "", reverse=True)
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    ARCHIVE.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    oldest_new = min((i["published_at"] or "" for i in new_items), default="")
    gap = bool(newest_before and oldest_new and oldest_new > newest_before)
    return {"added": added, "updated": updated, "total": len(merged),
            "gap": gap, "oldest_new": oldest_new, "newest_before": newest_before}
