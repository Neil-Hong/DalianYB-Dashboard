/**
 * Homepage intro: start the 3D scene (or the 2D fallback) and handle ENTER / Esc.
 *
 * The intro is controlled by the route alone: it is rendered only by the homepage, and it plays
 * every time that page is shown (fresh load, refresh, navigating back). There is no "seen" flag.
 * Returns a cleanup function so the intro can be torn down and started again on the same
 * element (React Strict Mode, client-side navigation, back/forward cache restores).
 */
type Controller = { exit(): Promise<void>; dispose(): void };

const STATE_CLASSES = ["started", "show-name", "show-enter", "leaving", "no-webgl"];

/** Put the page in "intro showing" state: overlay visible, page underneath hidden and locked. */
export function showIntroOverlay() {
  const html = document.documentElement;
  html.classList.remove("intro-off");
  html.classList.add("intro-on");
  const root = document.getElementById("intro");
  if (root) {
    root.classList.remove(...STATE_CLASSES);
    root.style.removeProperty("--below");
  }
}

export function initIntro(): () => void {
  const html = document.documentElement;
  const root = document.getElementById("intro");
  if (!root) return () => {};
  // the boot script hides the intro when the visitor arrived by switching language
  if (html.classList.contains("intro-off")) return () => {};

  showIntroOverlay(); // the pre-paint script did this on a direct load; needed after client navigation

  const canvas = root.querySelector<HTMLCanvasElement>(".intro-canvas")!;
  const button = root.querySelector<HTMLButtonElement>(".intro-enter")!;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let controller: Controller | null = null;
  let leaving = false;
  let disposed = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };

  const showName = () => root.classList.add("show-name");
  const showEnter = () => {
    root.classList.add("show-enter");
    button.tabIndex = 0;
    button.focus({ preventScroll: true });
  };

  function enter() {
    if (leaving || disposed) return;
    leaving = true;
    root!.classList.add("leaving");
    controller?.exit(); // 3D push-in runs alongside the 1 s CSS fade
    later(() => {
      controller?.dispose();
      controller = null;
      button.tabIndex = -1;
      // the overlay stays in the DOM (React owns it) and is hidden by html.intro-off
      html.classList.remove("intro-on");
      html.classList.add("intro-off");
    }, 1000);
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") enter(); };
  button.addEventListener("click", enter);
  addEventListener("keydown", onKey);

  function fallback() {
    const img = root!.querySelector<HTMLImageElement>(".fb-crest")!;
    img.src = img.dataset.src!;
    root!.classList.add("started", "no-webgl");
    root!.style.setProperty("--below", "62vh");
    later(showName, reducedMotion ? 0 : 2600);
    later(showEnter, reducedMotion ? 0 : 4200);
  }

  // testing aid: /?introAt=3.2 freezes the sequence at 3.2 s
  const freezeAt = (() => {
    const v = new URLSearchParams(location.search).get("introAt");
    return v != null && !isNaN(+v) ? +v : null;
  })();

  const gl = (() => {
    try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
  })();

  if (!gl) {
    fallback();
  } else {
    import("../intro/scene")
      .then(({ startIntro }) =>
        startIntro(canvas, {
          onLayout: (px) => root.style.setProperty("--below", `${px}px`),
          onLogoSettled: () => { if (!disposed) showName(); },
          onComplete: () => { if (!disposed) showEnter(); },
        }, { reducedMotion, freezeAt }),
      )
      .then((c) => {
        if (disposed) { c.dispose(); return; } // torn down while the scene was loading
        controller = c;
        root.classList.add("started");
      })
      .catch((err) => { if (!disposed) { console.error("intro failed, using 2D fallback", err); fallback(); } });
  }

  return () => {
    disposed = true;
    timers.forEach(clearTimeout);
    button.removeEventListener("click", enter);
    removeEventListener("keydown", onKey);
    controller?.dispose();
    controller = null;
    button.tabIndex = -1;
    root.classList.remove(...STATE_CLASSES);
    html.classList.remove("intro-on", "intro-off");
  };
}
