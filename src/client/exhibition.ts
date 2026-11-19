/** Exhibition page: scroll reveal, parallax and the zooming lightbox. Runs once per page load. */
export function initExhibition() {
  const html = document.documentElement;
  if (html.dataset.exhibitionInit) return; // effects run twice under React Strict Mode
  html.dataset.exhibitionInit = "1";

  const body = document.querySelector<HTMLElement>(".ex-body");
  const dialog = document.querySelector<HTMLDialogElement>("dialog.lb");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (body && dialog) {
    const photos: { src: string; w: number; h: number }[] = JSON.parse(body.dataset.photos!);
    const figures = [...body.querySelectorAll<HTMLElement>(".ph")];
    const thumbs = new Map<number, HTMLButtonElement>();
    body.querySelectorAll<HTMLButtonElement>(".ph-btn").forEach((b) => thumbs.set(+b.dataset.i!, b));

    // ---------------------------------------------------------------- reveal + parallax
    const visible = new Set<HTMLElement>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); visible.add(e.target as HTMLElement); }
        else visible.delete(e.target as HTMLElement);
      }
      schedule();
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    figures.forEach((f) => io.observe(f));

    const heroBg = document.querySelector<HTMLElement>(".ex-hero-bg");
    let ticking = false;
    function schedule() { if (!ticking && !reduced) { ticking = true; requestAnimationFrame(parallax); } }
    function parallax() {
      ticking = false;
      const vh = innerHeight;
      for (const f of visible) {
        const r = f.getBoundingClientRect();
        const d = (r.top + r.height / 2 - vh / 2) / vh;     // -1 .. 1 around the viewport centre
        f.querySelector<HTMLElement>("img")!.style.setProperty("--py", `${(d * -4).toFixed(2)}%`);
      }
      if (heroBg && scrollY < vh) heroBg.style.setProperty("--hy", `${scrollY * 0.3}px`);
    }
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);

    // ---------------------------------------------------------------- lightbox
    const stage = dialog.querySelector<HTMLElement>(".lb-stage")!;
    const countEl = dialog.querySelector<HTMLElement>(".lb-count b")!;
    const EASE = "cubic-bezier(.2, .85, .2, 1)";
    let index = 0, img: HTMLImageElement | null = null, busy = false;

    const fit = (i: number) => {
      const { w, h } = photos[i];
      const padX = innerWidth < 640 ? 12 : 96, padY = innerWidth < 640 ? 80 : 72;
      const s = Math.min((innerWidth - padX * 2) / w, (innerHeight - padY * 2) / h);
      const width = w * s, height = h * s;
      return { x: (innerWidth - width) / 2, y: (innerHeight - height) / 2, width, height };
    };
    const place = (el: HTMLImageElement, i: number) => {
      const r = fit(i);
      Object.assign(el.style, { width: `${r.width}px`, height: `${r.height}px`, transform: `translate(${r.x}px, ${r.y}px)` });
      return r;
    };
    const make = (i: number) => {
      const el = new Image();
      el.src = photos[i].src; el.alt = ""; el.decoding = "async"; el.draggable = false;
      return el;
    };
    const preload = (i: number) => { if (photos[i]) new Image().src = photos[i].src; };
    const setCount = (i: number) => { countEl.textContent = String(i + 1).padStart(2, "0"); };
    const thumbRect = (i: number) => {
      const r = thumbs.get(i)?.querySelector(".ph-frame")?.getBoundingClientRect();
      return r && r.bottom > 0 && r.top < innerHeight ? r : null;
    };

    async function open(i: number) {
      index = i; setCount(i);
      stage.replaceChildren();
      img = make(i);
      stage.append(img);
      const to = place(img, i);
      dialog!.showModal();
      requestAnimationFrame(() => dialog!.classList.add("shown"));
      const from = thumbRect(i);
      if (!reduced && from) {
        // zoom out of the thumbnail (FLIP)
        const sx = from.width / to.width, sy = from.height / to.height;
        img.animate([
          { transform: `translate(${from.left}px, ${from.top}px) scale(${sx}, ${sy})`, opacity: 1 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(1, 1)`, opacity: 1 },
        ], { duration: 650, easing: EASE });
      } else if (!reduced) {
        img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      }
      preload(i + 1); preload(i - 1);
    }

    async function go(d: number) {
      if (busy || !img) return;
      const next = (index + d + photos.length) % photos.length;
      busy = true;
      const incoming = make(next);
      const to = place(incoming, next);
      try { await incoming.decode(); } catch {}
      stage.append(incoming);
      const old = img, oldR = fit(index);
      index = next; img = incoming; setCount(next);
      if (reduced) { old.remove(); busy = false; return; }
      const shift = Math.min(160, innerWidth * 0.12) * d;
      old.animate([
        { transform: `translate(${oldR.x}px, ${oldR.y}px) scale(1)`, opacity: 1 },
        { transform: `translate(${oldR.x - shift}px, ${oldR.y}px) scale(.94)`, opacity: 0 },
      ], { duration: 520, easing: EASE, fill: "forwards" }).finished.then(() => old.remove());
      await incoming.animate([
        { transform: `translate(${to.x + shift}px, ${to.y}px) scale(1.04)`, opacity: 0 },
        { transform: `translate(${to.x}px, ${to.y}px) scale(1)`, opacity: 1 },
      ], { duration: 620, easing: EASE }).finished.catch(() => {});
      busy = false;
      preload(next + d);
    }

    async function close() {
      if (!dialog!.open || !img) return;
      dialog!.classList.remove("shown");
      const to = thumbRect(index), from = fit(index);
      thumbs.get(index)?.closest(".ph")?.scrollIntoView({ block: "nearest" });
      if (!reduced) {
        const anim = to
          ? img.animate([
              { transform: `translate(${from.x}px, ${from.y}px) scale(1, 1)` },
              { transform: `translate(${to.left}px, ${to.top}px) scale(${to.width / from.width}, ${to.height / from.height})` },
            ], { duration: 520, easing: EASE, fill: "forwards" })
          : img.animate([{ opacity: 1 }, { opacity: 0, transform: `translate(${from.x}px, ${from.y + 30}px)` }], { duration: 320, fill: "forwards" });
        await anim.finished.catch(() => {});
      }
      dialog!.close();
      stage.replaceChildren();
      thumbs.get(index)?.focus({ preventScroll: true });
    }

    thumbs.forEach((b, i) => b.addEventListener("click", () => open(i)));
    dialog.querySelector(".lb-close")!.addEventListener("click", close);
    dialog.querySelector(".lb-prev")!.addEventListener("click", () => go(-1));
    dialog.querySelector(".lb-next")!.addEventListener("click", () => go(1));
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });
    addEventListener("resize", () => { if (dialog.open && img) place(img, index); });

    // swipe left/right; a tap on the dark area closes
    let sx = 0, sy = 0, moved = false;
    stage.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; moved = false; });
    stage.addEventListener("pointermove", (e) => { if (Math.abs(e.clientX - sx) > 8) moved = true; });
    stage.addEventListener("pointerup", (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (moved && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      else if (!moved && e.target === stage) close();
    });
  }
}
