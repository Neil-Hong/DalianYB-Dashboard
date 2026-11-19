"use client";
import { useLayoutEffect } from "react";
import { initIntro, showIntroOverlay } from "./intro";

/**
 * Homepage 3D intro. Renders nothing; the overlay markup comes from the server.
 * Plays whenever the homepage is shown: on load/refresh, after client-side navigation (layout
 * effect, so the overlay is up before the first paint) and when the browser restores the page
 * from its back/forward cache.
 */
export default function IntroClient() {
  useLayoutEffect(() => {
    let cleanup = initIntro();

    // Leaving the page: if it goes into the back/forward cache, store it with the overlay up, so a
    // "Back" to the homepage shows the intro straight away instead of the page underneath.
    const onHide = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      cleanup();
      showIntroOverlay();
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) cleanup = initIntro();
    };
    addEventListener("pagehide", onHide);
    addEventListener("pageshow", onShow);
    return () => {
      removeEventListener("pagehide", onHide);
      removeEventListener("pageshow", onShow);
      cleanup();
    };
  }, []);
  return null;
}
