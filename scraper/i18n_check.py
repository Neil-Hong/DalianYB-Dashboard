"""List Chinese data strings that have no English entry in data/translations.yaml.

    python scraper/i18n_check.py      (or: npm run i18n:check)

Prints a YAML snippet you can paste into data/translations.yaml and fill in.
Mirrors the lookup rules in src/i18n/index.ts (club suffixes, split nationalities).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT / "data" / "generated"
SUFFIX = re.compile(r"(U\d{2}|预备队|青年队|B队|二队)$")
LATIN = re.compile(r"^[\x00-\x7FÀ-ɏ\s]+$")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    d = yaml.safe_load((ROOT / "data" / "translations.yaml").read_text(encoding="utf-8")) or {}
    load = lambda p: json.loads(p.read_text(encoding="utf-8"))

    def known(cat: str, zh: str) -> bool:
        if not zh or LATIN.match(zh) or zh in (d.get(cat) or {}):
            return True
        if cat == "nationalities" and "/" in zh:
            return all(known(cat, part) for part in zh.split("/"))
        if cat in ("teams", "clubs"):
            pool = {**(d.get("teams") or {}), **(d.get("clubs") or {})}
            return zh in pool or SUFFIX.sub("", zh) in pool
        return False

    need: dict[str, set[str]] = {}
    add = lambda cat, zh: (not known(cat, zh)) and need.setdefault(cat, set()).add(zh)

    for f in (GEN / "fixtures").glob("*.json"):
        for m in load(f):
            add("teams", m["home"]["name"]); add("teams", m["away"]["name"]); add("competitions", m["competition"])
    for f in (GEN / "standings").glob("*.json"):
        for r in load(f):
            add("teams", r["team"])
    squad = load(GEN / "squad.json")
    for p in squad["players"]:
        add("nationalities", p.get("nationality") or "")
    for s in squad["staff"]:
        add("nationalities", s.get("nationality") or ""); add("roles", s["role"])
        if not s.get("name_en"):
            add("people", s["name_zh"])
    for f in (GEN / "players").glob("*.json"):
        p = load(f)
        add("foot", p.get("foot") or "")
        for c in p["career"]:
            add("clubs", c["club"])
        for t in p["transfers"]:
            add("clubs", t["from"] or ""); add("clubs", t["to"] or "")
        for h in p["honours"]:
            add("honours", h["name"])
        for i in p["injuries"]:
            add("injuries", i["type"]); add("clubs", i["team"] or "")
    news_file = ROOT / "data" / "news.json"
    if news_file.exists():
        for n in load(news_file):
            for tag in n.get("tags") or []:
                add("competitions", tag)

    if not need:
        print("All data strings have English translations.")
        return
    total = sum(len(v) for v in need.values())
    print(f"# {total} untranslated (shown in Chinese on the English site). Add to data/translations.yaml:\n")
    for cat in sorted(need):
        print(f"{cat}:")
        for zh in sorted(need[cat]):
            print(f"  {zh}: ")
        print()


if __name__ == "__main__":
    main()
