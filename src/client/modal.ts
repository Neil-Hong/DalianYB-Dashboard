/** Open/close behaviour for every dialog.modal on the page. Runs once per page load. */
export function initModals() {
  const html = document.documentElement;
  if (html.dataset.modalsInit) return; // effects run twice under React Strict Mode
  html.dataset.modalsInit = "1";

  const CLOSE_MS = 220;

  function close(d: HTMLDialogElement) {
    if (!d.open || d.classList.contains("closing")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { d.close(); return; }
    d.classList.add("closing");
    setTimeout(() => { d.classList.remove("closing"); d.close(); }, CLOSE_MS);
  }

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const opener = target.closest<HTMLElement>("[data-modal-open]");
    if (opener) {
      const d = document.getElementById(opener.dataset.modalOpen!) as HTMLDialogElement | null;
      if (d && !d.open) { d.showModal(); d.querySelector<HTMLElement>(".modal-body")?.scrollTo(0, 0); }
      return;
    }
    const d = target.closest<HTMLDialogElement>("dialog.modal");
    if (!d) return;
    // the X button, or a click on the backdrop (the dialog box itself, outside the card)
    if (target.closest("[data-modal-close]") || target === d) close(d);
  });

  for (const d of document.querySelectorAll<HTMLDialogElement>("dialog.modal")) {
    d.addEventListener("cancel", (e) => { e.preventDefault(); close(d); });
  }
}
