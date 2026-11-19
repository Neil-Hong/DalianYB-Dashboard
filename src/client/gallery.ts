/** Gallery landing: captions, rail, keyboard, and the WebGL stage. Runs once per page load. */
export function initGalleryStage() {
  const html = document.documentElement;
  if (html.dataset.galleryInit) return; // effects run twice under React Strict Mode
  html.dataset.galleryInit = "1";

  const root = document.querySelector<HTMLElement>(".gstage");
  if (root) {
    const canvas = root.querySelector<HTMLCanvasElement>(".gl")!;
    const slides = JSON.parse(root.dataset.slides!);
    const ghosts = JSON.parse(root.dataset.ghosts!);
    const titles = [...root.querySelectorAll<HTMLAnchorElement>(".cap-title")];
    const idx = [...root.querySelectorAll<HTMLElement>(".cap-index .cur b")];
    const metas = [...root.querySelectorAll<HTMLElement>(".cap-meta span")];
    const rail = [...root.querySelectorAll<HTMLButtonElement>(".rail button")];
    const side = root.querySelector<HTMLElement>(".side-text span")!;
    const header = document.querySelector<HTMLElement>(".site-header");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = 0;
    let stage: { go(i: number): void; step(d: number): void; dispose(): void } | null = null;

    const setActive = (i: number) => {
      titles.forEach((el, j) => {
        const was = el.classList.contains("on");
        el.classList.toggle("on", j === i);
        el.classList.toggle("out", was && j !== i && j < i);
        el.tabIndex = j === i ? 0 : -1;
        if (j === i) el.removeAttribute("aria-hidden"); else el.setAttribute("aria-hidden", "true");
      });
      idx.forEach((el, j) => el.classList.toggle("on", j === i));
      metas.forEach((el, j) => el.classList.toggle("on", j === i));
      rail.forEach((el, j) => { el.classList.toggle("on", j === i); el.setAttribute("aria-current", j === i ? "true" : "false"); });
      side.textContent = titles[i]?.textContent ?? "";
      if (i !== current) root.classList.add("moved");
      current = i;
    };

    const open = (i: number) => {
      const url = titles[i]?.href;
      if (!url) return;
      if (reducedMotion) { location.href = url; return; }
      root.classList.add("leaving");
      setTimeout(() => { location.href = url; }, 480);
    };
    // the caption link itself also gets the exit animation
    titles.forEach((a, i) => a.addEventListener("click", (e) => { e.preventDefault(); open(i); }));
    // coming back via the browser's back button: undo the exit state
    addEventListener("pageshow", (e) => { if (e.persisted) root.classList.remove("leaving"); });

    rail.forEach((b) => b.addEventListener("click", () => stage?.go(+b.dataset.go!)));
    addEventListener("keydown", (e) => {
      if (!stage) return;
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) { e.preventDefault(); stage.step(1); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); stage.step(-1); }
      else if (e.key === "Enter" && document.activeElement === document.body) open(current);
    });

    const webgl = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
    if (!webgl) root.classList.add("no-webgl");
    else {
      import("../gallery/stage").then(({ startStage }) => {
        stage = startStage(canvas, slides, ghosts, {
          onActive: setActive,
          onLayout: (top, fw) => { root.style.setProperty("--cap", `${top}px`); root.style.setProperty("--fw", `${fw}px`); },
          onOpen: open,
          onHover: (over) => root.classList.toggle("hovering", over),
        }, { reducedMotion, topInset: () => header?.getBoundingClientRect().bottom ?? 0 });
      }).catch((err) => { console.error("gallery stage failed", err); root.classList.add("no-webgl"); });
    }
  }
}
