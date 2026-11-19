import type { ReactNode } from "react";
import type { Lang } from "../../i18n";
import "../../styles/global.css";
import "../../styles/motion.css";

// Runs before first paint: motion on unless the visitor prefers reduced motion, and never leave
// reveal targets hidden for long if the motion script fails to load.
// The browser's automatic page transition rejects its promises when a navigation interrupts it
// (e.g. a quick Back); that's expected, so keep it out of the console.
const MOTION_BOOT = `if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("motion");
  setTimeout(function () { document.documentElement.classList.add("rv-ready"); }, 3000);
}
["pageswap", "pagereveal"].forEach(function (type) {
  addEventListener(type, function (e) {
    var vt = e.viewTransition;
    if (vt) [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { p && p.catch(function () {}); });
  });
});`;

/** <html>/<body> for one language; each language has its own root layout. */
export function RootDocument({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    // pre-paint scripts add classes to <html> (motion, intro-on/off) before React hydrates
    <html lang={lang === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body className={`lang-${lang}`}>{children}</body>
    </html>
  );
}
