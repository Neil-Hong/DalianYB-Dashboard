/**
 * Site-wide scroll reveals and count-ups. Elements are picked by selector, so pages need no
 * markup changes. Runs only when the layout set html.motion (JS on, no reduced-motion).
 * The gallery pages and the homepage intro have their own motion and are left alone.
 */
type Variant = "up" | "row" | "scale" | "pop" | "mask";

// first match wins, so more specific rules come first
const RULES: [string, Variant][] = [
  [".page-head h1, .hero h1, .phero h1", "mask"],
  [".hero-crest, .phero .avatar", "scale"],
  [".pills .result-pill, .next .side img", "pop"],
  [".page-head > *, .hero-text > *, .phero-inner > div > *", "up"],
  [
    "main .list > li, main .feed > li, main .tl > li, .leader li, .injuries li, .info dl > div, .club-facts dl > div, .staff-row, main table.data tbody tr",
    "row",
  ],
  ["main .card, .pos > h2, .month > h2, .day > h2, .filters, .more", "up"],
];
const COUNT = ".hero-stats dd, .pstats dd, .facts dd, .sum-r b, .lval";
const STEP: Record<Variant, number> = { up: 70, row: 35, scale: 90, pop: 60, mask: 90 };
const MAX_DELAY = 700;

const skip = (el: Element): boolean =>
  !!el.closest("dialog, .intro, .gstage, .ex-body, .ex-hero, .ex-next") || !!document.querySelector("body > .theme-dark");

function setupReveal() {
  const targets = new Map<HTMLElement, Variant>();
  for (const [sel, v] of RULES) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (!targets.has(el) && !skip(el)) targets.set(el, v);
    });
  }
  const finish = (el: HTMLElement, delay: number, v: Variant) => {
    // hand the element back to its own styles (hover transforms etc.) once it has landed
    setTimeout(() => {
      el.removeAttribute("data-rv");
      el.style.removeProperty("--rv-d");
      el.classList.remove("rv-in");
    }, delay + (v === "row" ? 750 : 1100));
  };
  if (!("IntersectionObserver" in window)) return () => {};

  // A fully clipped "mask" heading has no visible area, so IntersectionObserver would never
  // report it; watch its parent instead and reveal the heading through that.
  const watch = new Map<Element, HTMLElement[]>();
  targets.forEach((v, el) => {
    const key = v === "mask" ? el.parentElement ?? el : el;
    watch.set(key, [...(watch.get(key) ?? []), el]);
  });

  const io = new IntersectionObserver((entries) => {
    const els: { el: HTMLElement; r: DOMRect }[] = [];
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      for (const el of watch.get(e.target) ?? []) els.push({ el, r: el.getBoundingClientRect() });
    }
    // cascade top-to-bottom, left-to-right
    els.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    let delay = 0;
    for (const { el } of els) {
      const v = targets.get(el)!;
      el.style.setProperty("--rv-d", `${delay}ms`);
      el.classList.add("rv-in");
      finish(el, delay, v);
      delay = Math.min(MAX_DELAY, delay + STEP[v]);
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.12 });

  targets.forEach((v, el) => { el.dataset.rv = v; });
  // tagging hides the elements now; observing (and so revealing) can start later
  return () => watch.forEach((_, key) => io.observe(key));
}

function setupCounters() {
  const els = [...document.querySelectorAll<HTMLElement>(COUNT)].filter((el) => !skip(el));
  if (!els.length || !("IntersectionObserver" in window)) return;
  const ease = (x: number) => 1 - Math.pow(2, -10 * x);

  const run = (el: HTMLElement) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; parts: (string | { v: number; dec: number })[] }[] = [];
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      const text = n.data;
      if (/[:\-–]/.test(text) || !/\d/.test(text)) continue;   // leave times, dates and dashes alone
      const parts: (string | { v: number; dec: number })[] = [];
      let last = 0;
      for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) {
        parts.push(text.slice(last, m.index));
        parts.push({ v: parseFloat(m[0]), dec: (m[0].split(".")[1] ?? "").length });
        last = m.index! + m[0].length;
      }
      parts.push(text.slice(last));
      nodes.push({ node: n, parts });
    }
    if (!nodes.length) return;
    const DUR = 1300, start = performance.now() + 120;
    const render = (p: number) => {
      for (const { node, parts } of nodes) {
        node.data = parts.map((x) => (typeof x === "string" ? x : (x.v * p).toFixed(x.dec))).join("");
      }
    };
    render(0);
    const frame = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / DUR));
      render(p >= 1 ? 1 : ease(p));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); run(e.target as HTMLElement); }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

function setupHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", update, { passive: true });
  update();
}

/** Set up reveals, counters and the header shadow once per page load. */
export function initMotion() {
  const root = document.documentElement;
  if (root.dataset.motionInit) return; // effects run twice under React Strict Mode
  root.dataset.motionInit = "1";
  setupHeader();
  if (root.classList.contains("motion")) {
    const intro = document.getElementById("intro");
    if (root.classList.contains("intro-on") && intro) {
      // homepage intro is up: tag everything now (hidden behind the overlay), reveal as it fades out
      const reveal = setupReveal();
      const start = () => { reveal(); setupCounters(); };
      const mo = new MutationObserver(() => {
        if (intro.classList.contains("leaving") || !intro.isConnected) { mo.disconnect(); setTimeout(start, 300); }
      });
      mo.observe(intro, { attributes: true, attributeFilter: ["class"] });
      mo.observe(document.body, { childList: true });
    } else {
      setupReveal()();
      setupCounters();
    }
  }
  root.classList.add("rv-ready");
}
