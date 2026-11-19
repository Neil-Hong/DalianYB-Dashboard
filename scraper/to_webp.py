"""Convert gallery photos in public/{stadium,tifo,supporters,champion} to WebP.

Each original is deleted only after its .webp has been written and re-opened successfully
with the same dimensions. Very large photos are capped at MAX_EDGE px on the long side.

    .venv\\Scripts\\python scraper/to_webp.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent / "public"
FOLDERS = ("stadium", "tifo", "supporters", "champion")
EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".gif"}
MAX_EDGE = 2400
QUALITY = 82


def convert(src: Path) -> tuple[int, int]:
    dst = src.with_suffix(".webp")
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)          # keep phone photos upright
        alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = im.convert("RGBA" if alpha else "RGB")
        if max(im.size) > MAX_EDGE:
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
        size = im.size
        im.save(dst, "WEBP", quality=QUALITY, method=6)
    with Image.open(dst) as check:                  # verify before deleting the original
        check.load()
        if check.size != size:
            raise RuntimeError(f"{dst.name}: size mismatch {check.size} != {size}")
    before, after = src.stat().st_size, dst.stat().st_size
    src.unlink()
    return before, after


def main() -> int:
    total_before = total_after = 0
    failed = 0
    for folder in FOLDERS:
        for src in sorted((ROOT / folder).glob("*")):
            if src.suffix.lower() not in EXTS:
                continue
            try:
                b, a = convert(src)
            except Exception as e:  # keep the original on any failure
                failed += 1
                print(f"  FAILED {folder}/{src.name}: {e}")
                continue
            total_before += b
            total_after += a
            print(f"  {folder}/{src.name} -> {src.stem}.webp  {b // 1024}K -> {a // 1024}K")
    if total_before:
        print(f"total {total_before // 1024}K -> {total_after // 1024}K ({100 - total_after * 100 // total_before}% smaller)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
