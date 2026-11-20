"use client";
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";

export interface Tip { x: number; y: number; lines: string[] }

/**
 * Shared chart plumbing: measures the container (charts are drawn at their real pixel width, so
 * text stays readable on phones), reports when the chart first scrolls into view (to start the
 * draw-in animation) and positions the tooltip.
 */
export function useChart(defaultWidth = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);
  const [inView, setInView] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, Math.round(el.clientWidth))));
    ro.observe(el);
    // no motion (reduced-motion or no JS boot): show the finished chart straight away
    if (!document.documentElement.classList.contains("motion") || !("IntersectionObserver" in window)) {
      setInView(true);
      return () => ro.disconnect();
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  const show = (e: PointerEvent<Element> | FocusEvent<Element>, lines: string[]) => {
    const box = ref.current?.getBoundingClientRect();
    const t = (e.currentTarget as Element).getBoundingClientRect();
    if (!box) return;
    setTip({ x: t.left + t.width / 2 - box.left, y: t.top - box.top, lines });
  };
  const hide = () => setTip(null);

  return { ref, width, inView, tip, show, hide };
}

/** "Nice" axis ticks from 0 to at least max. */
export function niceTicks(max: number, target = 5): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(+v.toFixed(6));
  if (ticks[ticks.length - 1] < max) ticks.push(+(ticks[ticks.length - 1] + step).toFixed(6));
  return ticks;
}

/** Every k-th integer label so labels stay at least `minGap` px apart. */
export function labelStep(count: number, plotWidth: number, minGap = 34) {
  const per = plotWidth / Math.max(1, count);
  return Math.max(1, Math.ceil(minGap / per));
}
