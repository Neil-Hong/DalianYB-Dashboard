import type { ReactNode } from "react";
import { club, meta } from "../../lib/data";
import { cx } from "../../lib/cx";
import { t, href, switchHref, fmtUpdated, type Lang, type UIKey } from "../../i18n";
import MotionClient from "../../client/MotionClient";
import BackToTop from "../../client/BackToTop";

const NAV: { p: string; key: UIKey }[] = [
  { p: "/", key: "nav.home" },
  { p: "/news", key: "nav.news" },
  { p: "/fixtures", key: "nav.fixtures" },
  { p: "/table", key: "nav.table" },
  { p: "/squad", key: "nav.squad" },
  { p: "/gallery", key: "nav.gallery" },
];

interface Props {
  lang: Lang;
  /** language-neutral path of the page, e.g. "/players/123" */
  path: string;
  /** dark page background (gallery); "stage" also drops the footer for full-screen pages */
  theme?: "dark" | "stage";
  /** rendered before the header (the homepage intro overlay) */
  intro?: ReactNode;
  children: ReactNode;
}

/**
 * Header, main and footer around a page. Internal links are plain <a> elements on purpose:
 * full document navigations keep the cross-document View Transitions and per-page motion
 * exactly as they were.
 */
export default function Shell({ lang, path, theme, intro, children }: Props) {
  const clubName = lang === "zh" ? club.name_zh : club.name_en;
  const pathname = href(lang, path);
  const isActive = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));

  return (
    <>
      {/* body-level marker the stylesheets key off (body:has(> .theme-dark)) */}
      {theme && <i hidden className={cx("theme-mark theme-dark", { "theme-stage": theme === "stage" })} />}
      {intro}
      <header className="site-header">
        <div className="wrap header-inner">
          <a href={href(lang, "/")} className="brand">
            <img src={club.logo} alt="" width={36} height={36} />
            <span className="brand-text">
              <strong>{clubName}</strong>
              <small>{lang === "zh" ? club.name_en : club.name_zh}</small>
            </span>
          </a>
          <div className="header-right">
            <nav aria-label={lang === "zh" ? "主导航" : "Main"}>
              {NAV.map((n) => (
                <a key={n.p} href={href(lang, n.p)} className={cx("nav-link", { active: isActive(n.p) })} aria-current={isActive(n.p) ? "page" : undefined}>
                  {t(lang, n.key)}
                </a>
              ))}
            </nav>
            <div className="lang-switch" role="group" aria-label="Language">
              <a href={switchHref(pathname, "en")} className={cx({ active: lang === "en" })} hrefLang="en" lang="en">EN</a>
              <a href={switchHref(pathname, "zh")} className={cx({ active: lang === "zh" })} hrefLang="zh-CN" lang="zh-CN">中文</a>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {theme !== "stage" && (
        <footer className="site-footer">
          <div className="wrap footer-inner">
            <p>{t(lang, "footer.unofficial")}</p>
            <p>
              {t(lang, "footer.source")}{" "}
              <a href="https://www.dongqiudi.com/team/122423" rel="noopener" target="_blank">懂球帝 Dongqiudi</a>
              {" · "}{t(lang, "footer.updated")} {fmtUpdated(lang, meta.updated_at)}
            </p>
          </div>
        </footer>
      )}
      <BackToTop label={lang === "zh" ? "回到顶部" : "Back to top"} />
      <MotionClient />
    </>
  );
}
