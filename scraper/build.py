"""Scrape dongqiudi.com and write the JSON files the site is built from.

Usage:
    python scraper/build.py              # use cached responses younger than 12h
    python scraper/build.py --refresh    # ignore the cache
    python scraper/build.py --skip-players

Outputs (all under data/generated/, never edit by hand):
    squad.json, fixtures/<season>.json, standings/csl-<season>.json,
    players/<id>.json, meta.json

Hand-maintained files (edit freely, never overwritten):
    data/club.json      club facts
    data/players.yaml   per-player overrides, keyed by dongqiudi player id
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
import dongqiudi  # noqa: E402
from http_client import BlockedError, PoliteClient, SnapshotClient  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "generated"
OVERRIDES = DATA / "players.yaml"

OVERRIDES_HEADER = """\
# Hand-maintained player overrides, keyed by dongqiudi player id.
# Any field set here replaces the scraped value (e.g. name_en, number, nationality).
# links: ids on other sites, used by later scrapers.
# New squad members are appended automatically; existing entries are never touched.
"""


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_overrides() -> dict:
    if not OVERRIDES.exists():
        OVERRIDES.write_text(OVERRIDES_HEADER, encoding="utf-8")
        return {}
    return yaml.safe_load(OVERRIDES.read_text(encoding="utf-8")) or {}


def append_new_overrides(players: list[dict], existing: dict) -> int:
    """Append a stub for each new player, as text, so comments in the file survive."""
    new = [p for p in players if p["id"] not in existing]
    if not new:
        return 0
    blocks = []
    for p in sorted(new, key=lambda p: (p["number"] is None, p["number"] or 0)):
        blocks.append(
            f'\n"{p["id"]}":  # {p["number"] or "-"} {p["name_zh"]}\n'
            f"  # name_en: {p['name_en'] or ''}\n"
            f"  links:\n    fbref: null\n    transfermarkt: null\n"
        )
    with OVERRIDES.open("a", encoding="utf-8") as f:
        f.write("".join(blocks))
    return len(new)


def apply_overrides(record: dict, overrides: dict) -> dict:
    o = overrides.get(record["id"]) or {}
    merged = {**record, **{k: v for k, v in o.items() if k != "links" and v is not None}}
    merged["links"] = {"dongqiudi": f"{dongqiudi.BASE}/player/{record['id']}.html", **(o.get("links") or {})}
    return merged


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="ignore cached responses")
    ap.add_argument("--skip-players", action="store_true", help="skip per-player profile pages")
    ap.add_argument("--snapshot", metavar="DIR", help="build from saved files instead of fetching")
    args = ap.parse_args()

    client = SnapshotClient(Path(args.snapshot)) if args.snapshot else PoliteClient(refresh=args.refresh)
    overrides = load_overrides()

    print("squad ...")
    squad = dongqiudi.fetch_squad(client)
    added = append_new_overrides(squad["players"], overrides)
    if added:
        print(f"  added {added} new player stub(s) to {OVERRIDES.relative_to(ROOT)}")
        overrides = load_overrides()

    print("fixtures ...")
    fixtures = dongqiudi.fetch_fixtures(client)
    for season, matches in fixtures.items():
        write_json(OUT / "fixtures" / f"{season}.json", matches)
        print(f"  {season}: {len(matches)} matches")
    current_season = max(fixtures)

    print("standings ...")
    standings = dongqiudi.fetch_standings(client)
    write_json(OUT / "standings" / f"csl-{current_season}.json", standings)

    players = []
    for p in squad["players"]:
        if not args.skip_players:
            print(f"  player {p['id']} {p['name_zh']}")
            try:
                profile = dongqiudi.fetch_player(client, p["id"])
            except BlockedError:
                raise
            except Exception as exc:  # keep going; one broken page shouldn't stop the build
                print(f"    ! failed: {exc}")
                profile = None
            if profile:
                full = apply_overrides({**profile, **{k: v for k, v in p.items() if v is not None}}, overrides)
                write_json(OUT / "players" / f"{p['id']}.json", full)
                # copy profile fields useful on the squad page
                p = {**p, **{k: profile.get(k) for k in ("birth_date", "height", "foot") if profile.get(k)}}
        players.append(apply_overrides(p, overrides))

    write_json(OUT / "squad.json", {"season": current_season, "staff": squad["staff"], "players": players})
    write_json(OUT / "meta.json", {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "current_season": current_season,
        "seasons": sorted(fixtures, reverse=True),
        "source": "dongqiudi.com",
    })
    print(f"done -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    try:
        main()
    except BlockedError as exc:
        sys.exit(f"stopped: {exc}")
