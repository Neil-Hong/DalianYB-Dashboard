import type { ReactNode } from "react";
import type { Lang } from "../../i18n";
import "../../styles/global.css";
import "../../styles/motion.css";

// Runs while the HTML is parsed, before first paint. (next/script "beforeInteractive" can't be used:
// in the App Router it only queues inline code for the Next runtime, which runs after first paint.)
// - motion on unless the visitor prefers reduced motion, and never leave reveal targets hidden
//   for long if the motion script fails to load;
// - on the homepage (the only page with the intro), show the intro overlay straight away so the
//   page underneath never flashes; the route decides, there is no "seen" flag;
// - the browser's automatic page transition rejects its promises when a navigation interrupts it
//   (e.g. a quick Back); that's expected, so keep it out of the console.
const BOOT = `(function () {
  var html = document.documentElement;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    html.classList.add("motion");
    setTimeout(function () { html.classList.add("rv-ready"); }, 3000);
  }
  if (/^\\/(zh\\/?)?$/.test(location.pathname)) { html.classList.remove("intro-off"); html.classList.add("intro-on"); }
  ["pageswap", "pagereveal"].forEach(function (type) {
    addEventListener(type, function (e) {
      var vt = e.viewTransition;
      if (vt) [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { p && p.catch(function () {}); });
    });
  });
})();`;

/** <html>/<body> for one language; each language has its own root layout. */
export function RootDocument({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    // the boot script adds classes to <html> (motion, intro-on) before React hydrates
    <html lang={lang === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <head>
        <script id="site-boot" dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className={`lang-${lang}`}>{children}</body>
    </html>
  );
}
