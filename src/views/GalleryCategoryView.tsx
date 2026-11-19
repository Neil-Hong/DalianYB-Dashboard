import Image from "next/image";
import Shell from "../components/layout/Shell";
import ExhibitionClient from "../client/ExhibitionClient";
import { CATEGORIES, cover, photos, type Category, type Photo } from "../lib/gallery";
import { vars } from "../lib/cx";
import { t, href, type Lang, type UIKey } from "../i18n";
import "../styles/components/exhibition.css";

const pad = (i: number) => String(i).padStart(2, "0");

/*
 * Editorial rhythm: rows of 1, 2 or 3 photos on a 12-column grid, each with its own column
 * span and vertical offset, so the page reads like a printed exhibition catalogue instead of
 * a uniform grid. Photos keep their own aspect ratio.
 */
type Cell = { p: Photo; i: number; col: string; drop: number };
const TEMPLATES: Record<number, { col: string; drop: number }[][]> = {
  1: [[{ col: "2 / span 10", drop: 0 }], [{ col: "1 / span 12", drop: 0 }]],
  2: [
    [{ col: "1 / span 7", drop: 0 }, { col: "9 / span 4", drop: 14 }],
    [{ col: "2 / span 4", drop: 10 }, { col: "7 / span 6", drop: 0 }],
    [{ col: "1 / span 5", drop: 0 }, { col: "7 / span 6", drop: 8 }],
  ],
  3: [
    [{ col: "1 / span 4", drop: 0 }, { col: "5 / span 4", drop: 9 }, { col: "9 / span 4", drop: 3 }],
    [{ col: "2 / span 3", drop: 6 }, { col: "6 / span 4", drop: 0 }, { col: "10 / span 3", drop: 12 }],
  ],
};
const PATTERN = [1, 2, 3, 2, 1, 3, 2, 2, 3];

function layout(list: Photo[]): Cell[][] {
  const rows: Cell[][] = [];
  const used: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let k = 0, r = 0;
  while (k < list.length) {
    let size = Math.min(PATTERN[r % PATTERN.length], list.length - k);
    // a feature row wants a landscape photo; borrow the next landscape one if this one is tall
    if (size === 1 && list[k].height > list[k].width) {
      const j = list.findIndex((p, x) => x > k && x < k + 4 && p.width > p.height * 1.2);
      if (j > 0) [list[k], list[j]] = [list[j], list[k]];
      else size = Math.min(2, list.length - k);
    }
    const opts = TEMPLATES[size];
    const tpl = opts[used[size]++ % opts.length];
    rows.push(tpl.map((c, x) => ({ p: list[k + x], i: k + x, ...c })));
    k += size; r++;
  }
  return rows;
}

/** responsive `sizes` from the cell's column span (12-column grid inside a 1360px wrapper) */
function sizesFor(col: string) {
  const span = Number(col.match(/span (\d+)/)?.[1] ?? 12);
  const vw = Math.round((span / 12) * 100);
  return `(max-width: 640px) 92vw, (max-width: 900px) ${Math.max(vw, 50)}vw, ${Math.round((span / 12) * 1360)}px`;
}

export function exhibitionTitle(lang: Lang, cat: Category) {
  return `${t(lang, `gallery.${cat}` as UIKey)} · ${t(lang, "gallery.title")}`;
}

export default function GalleryCategoryView({ lang, cat }: { lang: Lang; cat: Category }) {
  const list = photos(cat);
  const title = t(lang, `gallery.${cat}` as UIKey);
  const index = CATEGORIES.indexOf(cat);
  const nextCat = CATEGORIES[(index + 1) % CATEGORIES.length];
  const nextCover = cover(nextCat);
  const heroImg = cover(cat);
  const rows = layout(list);
  // the lightbox shows the original files at full resolution
  const data = list.map((p) => ({ src: p.src, w: p.width, h: p.height }));

  return (
    <Shell lang={lang} path={`/gallery/${cat}`} theme="dark">
      <div className="v-exhibit">
        <section className="ex-hero">
          {heroImg && <div className="ex-hero-bg" style={{ backgroundImage: `url(${heroImg.src})` }} aria-hidden="true"></div>}
          <div className="wrap-wide ex-hero-inner">
            <a className="back" href={href(lang, "/gallery")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
              <span>{t(lang, "gallery.back")}</span>
            </a>
            <p className="ex-kicker"><span>{pad(index + 1)}</span><i></i>{pad(CATEGORIES.length)} · DALIAN YINGBO</p>
            <h1 className="ex-title">{[...title].map((ch, j) => <span key={j} style={vars({ "--j": j })}>{ch === " " ? " " : ch}</span>)}</h1>
            <p className="ex-count">{t(lang, "gallery.photos", { n: list.length })}</p>
          </div>
        </section>

        <div className="wrap-wide ex-body" data-photos={JSON.stringify(data)} data-cat={title}>
          {rows.map((row, ri) => (
            <div key={ri} className={`ex-row n${row.length}`}>
              {row.map((c) => (
                <figure key={c.p.src} className="ph" style={vars({ gridColumn: c.col, "--drop": `${c.drop}vh` })}>
                  <button type="button" className="ph-btn" data-i={c.i} aria-label={t(lang, "gallery.photoAlt", { cat: title, n: c.i + 1, total: list.length })}>
                    <span className="ph-frame" style={{ aspectRatio: `${c.p.width} / ${c.p.height}` }}>
                      <Image src={c.p.src} alt="" width={c.p.width} height={c.p.height} sizes={sizesFor(c.col)}
                        {...(c.i === 0 ? { preload: true, fetchPriority: "high" as const } : { loading: c.i < 2 ? ("eager" as const) : ("lazy" as const) })} />
                    </span>
                  </button>
                  <figcaption>No. {pad(c.i + 1)}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>

        <nav className="wrap-wide ex-next" aria-label={t(lang, "gallery.next")}>
          <a className="next-card" href={href(lang, `/gallery/${nextCat}`)}>
            {nextCover && <Image src={nextCover.src} alt="" width={nextCover.width} height={nextCover.height} sizes="(max-width: 1392px) 100vw, 1360px" />}
            <span className="next-text">
              <small>{t(lang, "gallery.next")}</small>
              <strong>{t(lang, `gallery.${nextCat}` as UIKey)}</strong>
            </span>
            <svg className="next-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </a>
          <a className="back back-bottom" href={href(lang, "/gallery")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
            <span>{t(lang, "gallery.back")}</span>
          </a>
        </nav>

        <dialog className="lb" aria-label={title}>
          <div className="lb-stage"></div>
          <div className="lb-top">
            <span className="lb-count"><b>01</b> / {pad(list.length)}</span>
            <button type="button" className="lb-btn lb-close" aria-label={t(lang, "gallery.close")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
          </div>
          <button type="button" className="lb-btn lb-prev" aria-label={t(lang, "gallery.prev")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></button>
          <button type="button" className="lb-btn lb-next" aria-label={t(lang, "gallery.nextPhoto")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>
        </dialog>
      </div>
      <ExhibitionClient />
    </Shell>
  );
}
