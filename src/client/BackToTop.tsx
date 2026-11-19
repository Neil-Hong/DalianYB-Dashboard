"use client";
import { useEffect, useRef, useState } from "react";
import "../styles/components/back-to-top.css";

const R = 21;
const C = 2 * Math.PI * R;

/**
 * Fixed button in the bottom-right corner. It fades in once the visitor has scrolled down a bit,
 * its gold ring fills with scroll progress, and clicking it scrolls smoothly back to the top.
 */
export default function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      setVisible(y > Math.max(480, innerHeight * 0.6)); // React skips re-renders when unchanged
      ring.current?.setAttribute("stroke-dashoffset", (C * (1 - (max > 0 ? Math.min(1, y / max) : 0))).toFixed(2));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const toTop = () => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // keyboard users continue from the top of the page instead of a now-hidden button
    document.querySelector<HTMLElement>(".site-header .brand")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      className={visible ? "to-top on" : "to-top"}
      onClick={toTop}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
    >
      <svg className="to-top-ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle className="track" cx="24" cy="24" r={R} />
        <circle ref={ring} className="fill" cx="24" cy="24" r={R} strokeDasharray={C.toFixed(2)} strokeDashoffset={C.toFixed(2)} />
      </svg>
      <svg className="to-top-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
    </button>
  );
}
