/**
 * Full-screen 3D intro. Only the homepage renders this component, so the route alone decides
 * when it plays: every load, refresh or return to the homepage, and never on other pages.
 * /?introAt=3.5 freezes the sequence at 3.5 s (for tweaking).
 */
import { vars } from "../lib/cx";
import IntroClient from "../client/IntroClient";
import "../styles/components/intro.css";

// runs while the HTML is parsed, before first paint, so the homepage never flashes underneath
const PRE_PAINT = `document.documentElement.classList.remove("intro-off");
document.documentElement.classList.add("intro-on");`;

export default function Intro({ lang }: { lang: "en" | "zh" }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
      <div id="intro" className="intro" role="dialog" aria-modal="true" aria-label={lang === "zh" ? "大连英博 开场动画" : "Dalian Yingbo intro"}>
        <div className="intro-bg" aria-hidden="true"></div>
        <canvas className="intro-canvas" aria-hidden="true"></canvas>

        <div className="intro-fallback" aria-hidden="true">
          <svg className="fb-star" viewBox="-50 -50 100 100">
            <defs>
              <linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff1c2" /><stop offset=".5" stopColor="#e8b84a" /><stop offset="1" stopColor="#9a6a12" />
              </linearGradient>
            </defs>
            <polygon fill="url(#fbg)" points="0,-48 11,-15 46,-15 18,6 28,40 0,19 -28,40 -18,6 -46,-15 -11,-15" />
          </svg>
          {/* src is set by the script only when the 2D fallback is used */}
          <img className="fb-crest" data-src="/intro/crest-face.webp" alt="" width={560} height={761} />
        </div>

        <div className="intro-loader" aria-hidden="true"><span></span></div>

        <div className="intro-copy">
          <h1 className="intro-name">
            <span className="zh" lang="zh-CN">{["大", "连", "英", "博"].map((c, i) => <span key={c} style={vars({ "--i": i })}>{c}</span>)}</span>
            <span className="rule" aria-hidden="true"></span>
            <span className="en" lang="en">DALIAN YINGBO</span>
          </h1>
          <button type="button" className="intro-enter" tabIndex={-1}>
            <span>ENTER</span>
          </button>
        </div>
      </div>
      <IntroClient />
    </>
  );
}
