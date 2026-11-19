/** Animate the overall-rating radar and score when the card scrolls into view. Runs once per page load. */
export function initAbility() {
  const html = document.documentElement;
  if (html.dataset.abilityInit) return; // effects run twice under React Strict Mode
  html.dataset.abilityInit = "1";

  const easeOutBack = (x: number) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const card of document.querySelectorAll<HTMLElement>(".ab[data-ability]")) {
    const { overall, values } = JSON.parse(card.dataset.ability!) as { overall: number; values: number[] };
    const shape = card.querySelector<SVGPolygonElement>(".shape")!;
    const dots = [...card.querySelectorAll<SVGCircleElement>(".dots circle")];
    const arc = card.querySelector<SVGCircleElement>(".gauge-arc")!;
    const num = card.querySelector<HTMLElement>(".gauge-num")!;
    const C = +arc.dataset.c!;
    const n = values.length, R = 92;

    const draw = (scale: (i: number) => number, score: number) => {
      const pts = values.map((v, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180), r = (R * v / 100) * scale(i);
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
      shape.setAttribute("points", pts.map((p) => p.map((x) => x.toFixed(2)).join(",")).join(" "));
      dots.forEach((d, i) => { d.setAttribute("cx", pts[i][0].toFixed(2)); d.setAttribute("cy", pts[i][1].toFixed(2)); });
      arc.setAttribute("stroke-dashoffset", (C * (1 - score / 100)).toFixed(2));
      num.textContent = String(Math.round(score));
    };

    if (reduced) { card.classList.add("ready", "play"); continue; }

    draw(() => 0, 0);
    card.classList.add("ready");

    const run = () => {
      card.classList.add("play");
      const DUR = 1500, STAGGER = 70, DELAY = 250;
      const start = performance.now() + DELAY;
      const frame = (now: number) => {
        const el = now - start;
        const p = (i: number) => Math.min(1, Math.max(0, (el - i * STAGGER) / DUR));
        const total = Math.min(1, Math.max(0, el / (DUR + (n - 1) * STAGGER)));
        draw((i) => easeOutBack(p(i)), overall * easeOutCubic(total));
        if (total < 1) requestAnimationFrame(frame);
        else draw(() => 1, overall);
      };
      requestAnimationFrame(frame);
    };

    if (!("IntersectionObserver" in window)) { run(); continue; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
    }, { threshold: 0.35 });
    io.observe(card);
  }
}
