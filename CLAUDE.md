# Global Self-Driving Lab Landscape (sdl-map)

Public site at https://sdl-map.discoverylabs.nl: a curated map, list, timeline and watch feed of self-driving
labs. Astro 6 with Pagefind search; the map itself is `public/map-legacy.html` with its scripts in `public/map-*.js`.
Visual canon: `DESIGN.md`. Read it before any UI change.

## Commands
- Setup: `npm ci` (Node 22.12 or later)
- Dev server: `npm run dev` (http://127.0.0.1:4321)
- Unit tests: `npm test`
- Map QA in Chrome: `node scripts/qa/map-audit.mjs --base http://127.0.0.1:4321 --label <name>` (dev server running;
  output in `scripts/qa/out/<label>/`)
- Small-phone fit (welcome card and controls between the shell bars): `node scripts/qa/small-phones.mjs` (dev server running)
- Build: `npm run build` (Astro, then Pagefind over `dist/`)
- Analytics pack: `npm run analytics` (Python 3.13; writes `public/analytics/`)
- Brand kit (mark, lockups, favicon set): `python3 scripts/brand/make_logo.py` (macOS: Avenir Next, `hb-shape`,
  `rsvg-convert`; writes `public/favicon.*`, the icon PNGs, `site.webmanifest` and `public/brand/`)

## Deploy is not automatic
Pushing `main` does not change the live site. GitHub Pages serves the `gh-pages` branch.
1. `npm run build`
2. Publish `dist/` to `gh-pages`, e.g. `npx gh-pages -d dist -m "Deploy <main sha>: <what changed>"`.
   `CNAME` ships from `public/`, so it is in `dist/`.
3. Push `main` as well.
4. Verify on the live URL with a hard refresh or a cache-buster query; Pages caches per URL.

## When the dataset changes
Data lives in `src/data/sdl_data.json` (labs), `sdl_watch.json` (watch items) and `sdl_evolution.json`.
After any change, in the same session:
1. `npm run analytics`. Never skip it: stale charts travel into other people's slides.
2. README banner: `python3 scripts/readme-card/make_card.py`, then the screenshot step in that script's docstring
   (writes `public/sdl-landscape-card.png`).
3. Update the README lab lists and counts in all five READMEs (en, zh-Hans, zh-Hant, ja, ko).
4. Build, deploy, verify (above).

## Conventions
- Five locales: `en`, `zh`, `zh-Hant`, `ja`, `ko`. UI strings in `src/i18n/ui.json`, About in `about.json`,
  Chinese place names in `china-names.json`. Change every locale in the same commit.
- Chinese name of the site: 全球自主实验室图谱. Use 自主实验室 for "self-driving lab" and 图谱 for "map".
- Colours, type and surfaces come from tokens in `public/tokens.css`. Never hard-code a colour inline.
- Fonts are self-hosted (`public/fonts/`). No third-party CDNs: visitor IPs stay off other servers.
- Entries need a public source; claims about a lab follow its own pages or a review, not press hype.
- Check UI changes in both Safari and Chrome, on a phone width (390 px) and a desktop width.
- Generators and one-off scripts that produce site assets are committed under `scripts/`, never left elsewhere.
- Commit messages: plain, saying what changed for a visitor. No Claude trailers.
