"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Adds `in` to its wrapper the first time it scrolls into view (drives the HTML bar animations). */
export default function AnimateIn({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!document.documentElement.classList.contains("motion") || !("IntersectionObserver" in window)) { setOn(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={[className, "ch-anim", on && "in"].filter(Boolean).join(" ")}>{children}</div>;
}
