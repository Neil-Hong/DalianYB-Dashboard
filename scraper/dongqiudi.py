"""Fetch and normalize Dalian Yingbo data from dongqiudi.com (懂球帝).

Only public JSON endpoints and server-rendered HTML are read; no page scripts are executed.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup

from http_client import PoliteClient

BASE = "https://www.dongqiudi.com"
TEAM_ID = "122423"          # id used in dongqiudi.com/team/<id> URLs
TEAM_FULL_ID = "50122423"   # id used inside the sport-data API
CSL_CID = "43"              # 中超 on dongqiudi.com/data

STAT_KEYS = {
    "出场": "apps", "进球": "goals", "助攻": "assists", "身价(欧)": "value",
    "失球": "conceded", "零封": "clean_sheets", "扑救": "saves", "解围": "clearances",
}


def parse_value_eur(text) -> int | None:
    """'180万' / '180万欧' / '€8.0M' -> euros as int."""
    if not text:
        return None
    s = str(text).replace("欧", "").replace("€", "").strip()
    m = re.match(r"([\d.]+)\s*(万|亿|M|K)?", s)
    if not m:
        return None
    mult = {"万": 10_000, "亿": 100_000_000, "M": 1_000_000, "K": 1_000, None: 1}[m.group(2)]
    return round(float(m.group(1)) * mult)


def clean_name(name: str) -> tuple[str, bool]:
    """'朱鹏宇(U21)' -> ('朱鹏宇', True)."""
    name = (name or "").strip()
    u21 = bool(re.search(r"[（(]U21[）)]", name))
    return re.sub(r"\s*[（(]U21[）)]", "", name), u21


def _int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _utc_iso(value: str | None) -> str | None:
    if not value:
        return None
    dt = datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _text(el) -> str:
    return el.get_text(" ", strip=True) if el else ""


# ---------------------------------------------------------------- squad

def fetch_squad(client: PoliteClient) -> dict:
    url = f"{BASE}/sport-data/soccer/biz/dqd/v1/team/member_v2/{TEAM_ID}?app=dqd"
    raw = json.loads(client.get_text(url))
    if raw.get("code") != 0:
        raise RuntimeError(f"squad endpoint returned {raw.get('code')}: {raw.get('message')}")

    staff, players = [], []
    for group in raw["data"]["list"]:
        for p in group["data"]:
            name_zh, u21 = clean_name(p.get("person_name", ""))
            base = {
                "id": p["person_id"],
                "name_zh": name_zh,
                "name_en": (p.get("person_en_name") or "").strip() or None,
                "nationality": p.get("nationality_name") or None,
                "age": _int(re.sub(r"\D", "", p.get("age") or "")),
                "photo": p.get("person_logo") or None,
            }
            if group["type"] in ("coach", "manager"):
                staff.append({**base, "group": group["type"], "role": p.get("type")})
                continue
            stats = {}
            for item in p.get("statistic") or []:
                for label, value in item.items():
                    key = STAT_KEYS.get(label, label)
                    stats[key] = value if key == "value" else _int(value)
            value = stats.pop("value", None)
            players.append({
                **base,
                "number": _int(p.get("shirtnumber")),
                "position": group["type"],  # attacker | midfielder | defender | goalkeeper
                "u21": u21,
                "captain": bool(p.get("captain_logo")),
                "market_value_eur": parse_value_eur(value),
                "season_stats": stats,
            })
    return {"staff": staff, "players": players}


# ---------------------------------------------------------------- fixtures

def _normalize_match(m: dict) -> dict:
    home_is_us = m["team_A_id"] == TEAM_FULL_ID
    status = (m.get("status") or "").lower()
    played = status == "played"
    hs, as_ = _int(m.get("fs_A")), _int(m.get("fs_B"))
    ph, pa = _int(m.get("ps_A")), _int(m.get("ps_B"))
    result = None
    if played and hs is not None and as_ is not None:
        ours, theirs = (hs, as_) if home_is_us else (as_, hs)
        if ours == theirs and ph is not None and pa is not None:
            ours, theirs = (ph, pa) if home_is_us else (pa, ph)
        result = "W" if ours > theirs else "L" if ours < theirs else "D"
    return {
        "id": m["match_id"],
        "kickoff": _utc_iso(m.get("start_play")),
        "time_confirmed": m.get("suretime") == "1",
        "competition": m.get("competition_name"),
        "competition_id": m.get("competition_id"),
        "round": m.get("gameweek") or m.get("round_name") or None,
        "status": status,
        "venue": "home" if home_is_us else "away",
        "home": {"id": m["team_A_id"], "name": m["team_A_name"], "logo": m.get("team_A_logo")},
        "away": {"id": m["team_B_id"], "name": m["team_B_name"], "logo": m.get("team_B_logo")},
        "score": {"home": hs, "away": as_} if played else None,
        "penalties": {"home": ph, "away": pa} if ph is not None else None,
        "result": result,
    }


def fetch_fixtures(client: PoliteClient) -> dict[str, list[dict]]:
    """Return {season_name: [matches]} for every season dongqiudi lists for the club."""
    url = f"{BASE}/sport-data/soccer/biz/dqd/v1/team/schedule/{TEAM_ID}?app=dqd"
    first = json.loads(client.get_text(url))
    seasons: dict[str, list[dict]] = {}
    for s in first["team_seasons"]:
        try:
            data = first if s.get("current") == 1 else json.loads(client.get_text(s["url"]))
        except FileNotFoundError as exc:  # snapshot mode without this season saved
            print(f"  skip season {s['season_name']}: {exc}")
            continue
        seasons[s["season_name"]] = [_normalize_match(m) for m in data.get("schedules") or []]
    return seasons


# ---------------------------------------------------------------- standings

def fetch_standings(client: PoliteClient, cid: str = CSL_CID) -> list[dict]:
    soup = BeautifulSoup(client.get_text(f"{BASE}/data?cid={cid}&tab=standings"), "lxml")
    rows = []
    for tr in soup.select(".dp-table .dp-row"):
        tds = tr.select("td")
        link = tr.select_one(".dp-team-link")
        logo = tr.select_one(".dp-team-logo")
        gf, _, ga = _text(tds[6]).partition("/")
        team_id = re.search(r"/team/(\d+)", link["href"]).group(1) if link else None
        rows.append({
            "rank": _int(_text(tds[0])),
            "team_id": team_id,
            "team": _text(link),
            "logo": logo["src"] if logo else None,
            "played": _int(_text(tds[2])),
            "won": _int(_text(tds[3])),
            "drawn": _int(_text(tds[4])),
            "lost": _int(_text(tds[5])),
            "goals_for": _int(gf),
            "goals_against": _int(ga),
            "goal_diff": _int(_text(tds[7]).replace("+", "")),
            "points": _int(_text(tds[8])),
            "is_us": team_id == TEAM_ID,
        })
    if not rows:
        raise RuntimeError("standings table not found; page layout may have changed")
    return rows


# ---------------------------------------------------------------- player profile

INFO_KEYS = {
    "英文名": "name_en", "国籍": "nationality", "生日": "birth_date", "身高": "height",
    "体重": "weight", "惯用脚": "foot", "号码": "number", "位置": "position_zh",
}


ABILITY_KEYS = {
    "速度": "pace", "力量": "physical", "防守": "defending", "盘带": "dribbling", "传球": "passing",
    "射门": "shooting", "扑救": "diving", "位置": "positioning", "反应": "reflexes", "开球": "kicking",
    "手型": "handling",
}
STAR_KEYS = {"国际声望": "reputation", "逆足能力": "weak_foot", "花式技巧": "skill_moves"}


def _image_resolver(html: str):
    """Pages saved as "Webpage, Complete" point <img> at local copies (./x_files/<name>.png).
    The embedded page data still holds the original URLs, so map file name -> URL."""
    urls = {}
    for m in re.finditer(r'https?:(?://|\\u002F\\u002F)[^"\s]+?\.(?:png|jpe?g|webp|gif)', html):
        url = m.group(0).replace("\\u002F", "/")
        urls.setdefault(url.rsplit("/", 1)[-1], url)

    def resolve(img) -> str | None:
        src = (img.get("src") or "").strip() if img else ""
        if not src:
            return None
        if src.startswith("http"):
            return src
        if src.startswith("//"):
            return "https:" + src
        return urls.get(src.rsplit("/", 1)[-1])
    return resolve


def _ability(soup) -> dict | None:
    box = soup.select_one(".pp-ability")
    score = _int(_text(box.select_one(".pp-ability__score"))) if box else None
    if not box or not score:
        return None
    attrs = []
    for item in box.select(".pp-ability__item"):
        label = _text(item.select_one(".pp-ability__label"))
        value = _int(_text(item.select_one(".pp-ability__val")))
        if label and value is not None:
            attrs.append({"key": ABILITY_KEYS.get(label, label), "label_zh": label, "value": value})
    stars = {}
    for row in box.select(".pp-ability__star-row"):
        key = STAR_KEYS.get(_text(row.select_one(".pp-ability__star-label")))
        if key:
            stars[key] = len(row.select(".pp-ability__star--fill"))
    return {"overall": score, "attributes": attrs, "stars": stars}


def fetch_player(client: PoliteClient, player_id: str) -> dict:
    html = client.get_text(f"{BASE}/player/{player_id}.html")
    soup = BeautifulSoup(html, "lxml")
    img_url = _image_resolver(html)

    info = {}
    for row in soup.select(".pp-info-row"):
        spans = row.find_all("span")
        if len(spans) >= 2:
            key = INFO_KEYS.get(_text(spans[0]))
            if key:
                info[key] = _text(spans[1]) or None
    for key in ("height", "weight"):
        if info.get(key):
            info[key] = _int(re.sub(r"\D", "", info[key]))
    if info.get("number"):
        info["number"] = _int(info["number"])

    for span in soup.select(".pp-hero__extra span"):
        label, _, value = _text(span).partition(" ")
        if label == "身价":
            info["market_value_eur"] = parse_value_eur(value)

    career = []
    for table in soup.select("table.pp-table"):
        headers = [_text(th) for th in table.select("thead th")]
        if not headers or headers[0] != "赛季":
            continue
        for tr in table.select("tbody tr"):
            cells = [_text(td) for td in tr.find_all("td")]
            if len(cells) < 8:
                continue
            career.append({
                "season": cells[0], "club": cells[1], "apps": _int(cells[2]),
                "starts": _int(cells[3]), "goals": _int(cells[4]), "assists": _int(cells[5]),
                "yellow": _int(cells[6]), "red": _int(cells[7]),
            })
        break  # only the first ("总计") tab is server-rendered

    transfers = []
    for row in soup.select(".pp-transfer-row"):
        teams = row.select(".pp-transfer-row__team")
        type_el = row.select_one(".pp-transfer-row__type")
        fee_el = type_el.find("span") if type_el else None
        fee = _text(fee_el).strip("（）() ") if fee_el else ""
        if fee_el:
            fee_el.extract()
        kind = _text(type_el)
        transfers.append({
            "date": _text(row.select_one(".pp-transfer-row__date")),
            "from": _text(teams[0]) if len(teams) > 0 else None,
            "from_logo": img_url(teams[0].find("img")) if len(teams) > 0 else None,
            "to": _text(teams[1]) if len(teams) > 1 else None,
            "to_logo": img_url(teams[1].find("img")) if len(teams) > 1 else None,
            "type": kind if kind and kind != "?" else None,
            "fee": fee or None,
            "fee_eur": parse_value_eur(fee),
        })

    honours = []
    for item in soup.select(".pp-honor-item"):
        count = re.sub(r"\D", "", _text(item.select_one(".pp-honor-item__count")))
        honours.append({"name": _text(item.select_one(".pp-honor-item__name")), "count": _int(count) or 1,
                        "logo": img_url(item.select_one(".pp-honor-item__logo"))})

    injuries = []
    for row in soup.select(".pp-injury-row"):
        start, _, end = _text(row.select_one(".pp-injury-row__date")).partition("~")
        injuries.append({
            "team": _text(row.select_one(".pp-injury-row__team")) or None,
            "type": _text(row.select_one(".pp-injury-row__type")),
            "from": start.strip().replace(".", "-") or None,
            "to": end.strip().replace(".", "-") or None,
        })

    return {"id": player_id, **info, "ability": _ability(soup), "career": career, "transfers": transfers,
            "honours": honours, "injuries": injuries}
