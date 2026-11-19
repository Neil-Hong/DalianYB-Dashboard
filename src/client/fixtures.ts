/** Competition filter chips on the fixtures page. Runs once per page load. */
export function initFixtureFilters() {
  const html = document.documentElement;
  if (html.dataset.fixturesInit) return; // effects run twice under React Strict Mode
  html.dataset.fixturesInit = "1";

  const chips = document.querySelectorAll<HTMLButtonElement>(".chip");
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter ?? "";
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      document.querySelectorAll<HTMLElement>(".match").forEach((m) => {
        m.hidden = !!f && m.dataset.competition !== f;
      });
      document.querySelectorAll<HTMLElement>("[data-month]").forEach((sec) => {
        sec.hidden = !sec.querySelector(".match:not([hidden])");
      });
    }),
  );
}
