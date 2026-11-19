# 大连英博 · Dalian Yingbo fan site

Unofficial hobby site with fixtures, the CSL table, the squad and player profiles for Dalian Yingbo.
Built with [Next.js](https://nextjs.org) (App Router, React, TypeScript); data lives as JSON/YAML in `data/`
and every page is pre-rendered at build time.

## Layout

```
scraper/            Python scraper (dongqiudi.com) -> data/generated/
data/club.json      hand-maintained club facts
data/players.yaml   hand-maintained per-player overrides (keyed by dongqiudi id)
data/news.json      news archive (headline, time, thumbnail, link); grows with each import
data/news-overrides.yaml  hand-maintained: hide / pin articles, add your own notes
data/generated/     scraper output, do not edit
src/                Next.js app (see "Code structure")
public/             static files: intro assets, gallery photos (public/<category>/*.webp)
```

## Code structure

```
src/app/(en)/...        English routes, served at /           (one thin page.tsx per route)
src/app/(zh)/zh/...     Chinese routes, served under /zh      (same views, lang="zh")
src/views/              one Server Component per page (HomeView, PlayerView, GalleryView, ...)
src/components/         shared Server Components (MatchRow, PlayerCard, Modal, Intro, ...)
src/components/layout/  RootDocument (<html>/<body>, per language) and Shell (header/footer)
src/client/             Client Components + the browser code they run (motion, intro, gallery
                        stage, lightbox, modals, filters). Everything else renders on the server.
src/lib/                data loading (reads data/ with fs at build time), news, gallery, SEO
src/i18n/               UI strings, data translations, date formatting
src/intro/, src/gallery/  three.js scenes for the homepage intro and the gallery stage
src/styles/             global.css, motion.css, components/*.css (one per component)
```

- **Styles**: each component's stylesheet in `src/styles/components/` wraps its rules in
  `@scope (.<root-class>)`, so they only apply inside that component. Inside a scope a selector
  matches descendants; style the component's own root element with `:scope`.
- **Links**: internal links are plain `<a>` elements, so every navigation is a full page load.
  That keeps the cross-document page transitions and the per-page reveal animations working.
- **Routes**: both language trees are generated from the same views; to add a page, add a view
  in `src/views/` and a `page.tsx` under both `src/app/(en)/` and `src/app/(zh)/zh/`.

## Update data (weekly, about 5 minutes)

Data is collected by hand: you save pages in your browser, a script sorts and builds them.

1. `npm run checklist`, then open `inbox/checklist.html` in your browser.
2. Open each link and press Ctrl+S into the `inbox/` folder. File names don't matter.
   - **Weekly:** news, squad, current fixtures, CSL table (4 links).
     For news, open the team page's 资讯 tab, scroll down until you pass the date the
     checklist shows (the newest item already archived), then save as **"Webpage, Complete"**
     so every loaded item is included. The import warns if the save doesn't reach that far.
   - **Once:** each player page and past seasons' fixtures. Re-save a player page only when
     you want their career/transfer history refreshed, or when a new player joins
     (the checklist marks missing ones as 待保存).
3. `npm run import`. Files are recognised by content and stored in `scraper/saved/`, the
   originals move to `inbox/_imported/<date>/`, and `data/generated/` is rebuilt.
4. `npm run build` (or `npm run dev` to look first). The build reads `data/` and pre-renders
   every page, so new data shows up after a rebuild (or on refresh while `npm run dev` runs).

First-time setup:

```bash
python -m venv .venv
.venv\Scripts\pip install requests beautifulsoup4 lxml pyyaml
npm install
```

`scraper/build.py` can also fetch directly (polite: 2s between requests, 12h cache), but
dongqiudi.com shows a bot check to scripts, and the scraper stops when it sees one rather
than trying to get past it. Manual saving is the supported path.

## Player pages

Everything on a player page comes from their saved dongqiudi page: info, the overall rating
and its six attributes (懂球帝 能力值, never estimated here; players without one show a
placeholder), honours with their trophy icons, career and transfers with club logos and fees.
Pages saved as "Webpage, Complete" still work: image URLs are recovered from the page's
embedded data. Career and transfers show the latest 5; "View all" opens the full list.

## Gallery

`/gallery` is a WebGL stage (`src/gallery/stage.ts`) with one cover per category; wheel,
drag/swipe, arrow keys or the numbered rail move between them, and clicking opens
`/gallery/<category>`. Each category page lists every `.webp` in `public/<category>/`
(`stadium`, `supporters`, `tifo`, `champion`), read at build time, so adding photos needs no code change:

1. Drop new photos (jpg/png…) into the folder.
2. `npm run gallery:webp` converts them to WebP (quality 82, long edge capped at 2400 px)
   and deletes each original only after its WebP has been verified.
3. Rebuild. The cover is `<category>-1.webp`.

## Motion

Site-wide motion lives in `src/styles/motion.css` and `src/client/motion.ts`, loaded by the
layout: cross-document page transitions, scroll reveals picked by selector (headings, cards,
list and table rows, result pills), count-up statistics and hover polish. Pages need no markup
changes; to animate a new kind of element, add its selector to `RULES` (and to the pre-paint
list at the top of `motion.css`). Everything is off with reduced motion, and the gallery and
homepage intro keep their own animation.

## Languages

English is the default (`/`), Chinese lives under `/zh/`. UI text is in `src/i18n/index.ts`.
Data that dongqiudi only has in Chinese (teams, clubs, competitions, honours, …) is translated
via `data/translations.yaml`. After importing new data run:

```bash
npm run i18n:check
```

It prints any missing entries as a YAML snippet to fill in. Missing ones show in Chinese on
the English site until added. News headlines stay in Chinese.

## Homepage intro

A 3D crest/star intro (three.js, `src/intro/scene.ts`, overlay in `src/components/Intro.tsx`, behaviour in `src/client/intro.ts`)
plays every time the homepage is shown (load, refresh, coming back to it) and never on other
pages; the route decides, there is no "already seen" flag. Assets live in `public/intro/`: the crest
artwork (`crest-face.webp`), a relief normal map derived from it, and the traced outline
(`shield.json`). Without WebGL a 2D version plays; with reduced-motion it shows the final frame.

- `/?introAt=3.5` freezes the intro at 3.5 s (for tweaking).
- Esc or ENTER skips to the site.

## Run the site

```bash
npm install
npm run dev        # http://localhost:4321 (hot reload)
npm run build      # production build -> .next/ (all pages pre-rendered)
npm run start      # serve the production build on http://localhost:4321
npm run typecheck  # TypeScript check
```

Deploying: the pages are static, but gallery photos go through Next's image optimiser
(`next/image`, AVIF/WebP per screen size), which needs a Next.js-capable host: `npm run start`
on any Node server, Vercel, or Cloudflare via the OpenNext adapter.

Data source: 懂球帝 (dongqiudi.com). Not affiliated with Dalian Yingbo FC.
