import Image from "next/image";
import Shell from "../components/layout/Shell";
import GalleryClient from "../client/GalleryClient";
import { CATEGORIES, cover, photos } from "../lib/gallery";
import { cx, vars } from "../lib/cx";
import { t, href, type Lang, type UIKey } from "../i18n";
import "../styles/components/gallery.css";

const pad = (i: number) => String(i).padStart(2, "0");

export default function GalleryView({ lang }: { lang: Lang }) {
  const slides = CATEGORIES.flatMap((cat) => {
    const c = cover(cat);
    return c ? [{ cat, title: t(lang, `gallery.${cat}` as UIKey), href: href(lang, `/gallery/${cat}`), count: photos(cat).length, ...c }] : [];
  });
  // background "ghosts": the two lightest non-cover photos of each category
  const ghosts = CATEGORIES.flatMap((cat) =>
    photos(cat).filter((p) => p.src !== cover(cat)?.src).sort((a, b) => a.bytes - b.bytes).slice(0, 2),
  ).map(({ src, width, height }) => ({ src, width, height }));

  return (
    <Shell lang={lang} path="/gallery" theme="stage">
      <div className="v-gallery">
        {/* the WebGL stage loads the original files as textures, so slide URLs stay unoptimised */}
        <section className="gstage" data-slides={JSON.stringify(slides.map(({ src, width, height }) => ({ src, width, height })))} data-ghosts={JSON.stringify(ghosts)}>
          <canvas className="gl" aria-hidden="true"></canvas>

          <h1 className="sr-only">{t(lang, "gallery.title")}</h1>

          <div className="caption" aria-live="polite">
            <div className="cap-index">
              <span className="cur">{slides.map((s, i) => <b key={s.cat} className={cx({ on: i === 0 }) || undefined}>{pad(i + 1)}</b>)}</span>
              <i></i><span>{pad(slides.length)}</span>
            </div>
            <div className="cap-titles">
              {slides.map((s, i) => (
                <a key={s.cat} href={s.href} className={cx("cap-title", { on: i === 0 })} tabIndex={i === 0 ? 0 : -1} aria-hidden={i === 0 ? undefined : true}>
                  {[...s.title].map((ch, j) => <span key={j} style={vars({ "--j": j })}>{ch === " " ? " " : ch}</span>)}
                </a>
              ))}
            </div>
            <div className="cap-meta">{slides.map((s, i) => <span key={s.cat} className={cx({ on: i === 0 }) || undefined}>{t(lang, "gallery.photos", { n: s.count })}</span>)}</div>
          </div>

          <nav className="rail" aria-label={t(lang, "gallery.title")}>
            {slides.map((s, i) => (
              <button key={s.cat} type="button" className={cx({ on: i === 0 }) || undefined} data-go={i} aria-label={s.title}><span>{pad(i + 1)}</span></button>
            ))}
          </nav>

          <p className="side-text" aria-hidden="true">DALIAN YINGBO <i>/</i> <span>{slides[0]?.title}</span> <i>/</i> {new Date().getFullYear()}</p>
          <p className="hint" aria-hidden="true"><span className="mouse"><span></span></span>{t(lang, "gallery.hint")}</p>

          {/* shown without WebGL */}
          <ol className="fallback">
            {slides.map((s) => (
              <li key={s.cat}>
                <a href={s.href}>
                  <Image src={s.src} alt="" width={s.width} height={s.height} sizes="(max-width: 600px) 74vw, 420px" />
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <GalleryClient />
    </Shell>
  );
}
