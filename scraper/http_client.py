"""Polite HTTP client: identifies itself, waits between requests, caches responses on disk."""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

import requests

CACHE_DIR = Path(__file__).parent / ".cache"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36 DalianYB-Fansite/0.1"
)


class BlockedError(RuntimeError):
    """The site answered with a bot-check page. We stop instead of trying to get past it."""


def _is_challenge(text: str) -> bool:
    head = text[:2000]
    return "EO_Bot_Ssid" in head or "Just a moment..." in head or head.startswith("<script>function a(")


class SnapshotClient:
    """Serves saved files instead of fetching. Files are matched by URL pattern, see snapshot_name()."""

    def __init__(self, directory: Path):
        self.directory = Path(directory)

    def get_text(self, url: str) -> str:
        path = self.directory / snapshot_name(url)
        if not path.exists():
            raise FileNotFoundError(f"no snapshot for {url} (expected {path.name})")
        return path.read_text(encoding="utf-8")


def snapshot_name(url: str) -> str:
    import re

    if m := re.search(r"/team/member_v2/", url):
        return "squad.json"
    if "/team/schedule/" in url:
        m = re.search(r"season_id=(\d+)", url)
        return f"schedule-{m.group(1)}.json" if m else "schedule.json"
    if m := re.search(r"/data\?cid=(\d+)&tab=standings", url):
        return f"standings-{m.group(1)}.html"
    if m := re.search(r"/player/(\d+)\.html", url):
        return f"player-{m.group(1)}.html"
    return hashlib.sha1(url.encode()).hexdigest()[:16] + ".txt"


class PoliteClient:
    def __init__(self, delay: float = 2.0, max_age_hours: float = 12.0, refresh: bool = False):
        self.delay = delay
        self.max_age = max_age_hours * 3600
        self.refresh = refresh
        self._last = 0.0
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "zh-CN,zh;q=0.9"})
        CACHE_DIR.mkdir(exist_ok=True)

    def get_text(self, url: str) -> str:
        path = CACHE_DIR / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".txt")
        if not self.refresh and path.exists() and time.time() - path.stat().st_mtime < self.max_age:
            return path.read_text(encoding="utf-8")

        wait = self.delay - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)
        resp = self.session.get(url, timeout=30)
        self._last = time.time()
        resp.raise_for_status()
        resp.encoding = "utf-8"
        if _is_challenge(resp.text):
            raise BlockedError(f"bot check returned for {url}; stopping (try later or use --snapshot)")
        path.write_text(resp.text, encoding="utf-8")
        return resp.text
