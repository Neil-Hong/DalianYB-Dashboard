// Gallery photos live in public/<category>/*.webp and are discovered at build time,
// so dropping a new .webp into the folder is all it takes to publish it.
import fs from "node:fs";
import path from "node:path";

export const CATEGORIES = ["stadium", "supporters", "tifo", "champion"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Photo { src: string; file: string; width: number; height: number; bytes: number }

const PUBLIC = path.join(process.cwd(), "public");

/** Width/height from a WebP file header (VP8, VP8L and VP8X variants). */
function webpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  return null;
}

const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function photos(cat: Category): Photo[] {
  const dir = path.join(PUBLIC, cat);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".webp"))
    .sort(natural.compare)
    .flatMap((file) => {
      const full = path.join(dir, file);
      const fd = fs.openSync(full, "r");
      const head = Buffer.alloc(32);
      fs.readSync(fd, head, 0, 32, 0);
      fs.closeSync(fd);
      const size = webpSize(head);
      if (!size) return [];
      return [{ src: `/${cat}/${encodeURIComponent(file)}`, file, ...size, bytes: fs.statSync(full).size }];
    });
}

/** The cover photo: <category>-1.webp when present, otherwise the first one. */
export function cover(cat: Category): Photo | undefined {
  const list = photos(cat);
  return list.find((p) => p.file.toLowerCase() === `${cat}-1.webp`) ?? list[0];
}
