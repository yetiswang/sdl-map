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
1. Fetch the published branch. A clone that only tracks `main` has a stale `origin/gh-pages` and the push is rejected:
   `git fetch origin +refs/heads/gh-pages:refs/remotes/origin/gh-pages`
2. `npm run build`
3. Publish `dist/` through a worktree (`gh-pages` is not a dependency, so `npx gh-pages` would download it):
   ```
   git worktree add -B gh-pages /tmp/sdl-ghp origin/gh-pages
   rsync -a --delete --exclude=.git dist/ /tmp/sdl-ghp/
   (cd /tmp/sdl-ghp && git add -A && git commit -m "Deploy <main sha>: <what changed>" && git push origin gh-pages)
   git worktree remove /tmp/sdl-ghp
   ```
   `CNAME` ships from `public/`, so it is in `dist/`.
4. Push `main` as well.
5. Verify on the live URL with a hard refresh or a cache-buster query; Pages caches per URL.

## Adding or changing an entry
Data lives in `src/data/sdl_data.json` (labs), `sdl_watch.json` (watch items) and `sdl_evolution.json`.
Submissions arrive as GitHub issues (label `lab-submission`, forms in `.github/ISSUE_TEMPLATE/`) or PRs.
1. Check the entry against the four rules on the About page (`src/i18n/about.json`, `rules`): public source,
   closed-loop intent, one entry per initiative at its home site, institutions not people. Look for a duplicate or a
   parent entry first. Figures without a public source stay out (`invest: 0`, funder name in `investLabel`).
2. Fields: `id, name, org, blurb, city, country, flag, lat, lon, tier, domain, maturity, charact, ai, scale, invest,
   investLabel, url, sources, start`. Enums as in `add-lab.yml`. No notes field: lineage goes in `org`.
   Chinese entries also need `src/i18n/china-names.json` (both scripts).
3. Optional watch item in `sdl_watch.json`, newest first, `related` set to the entry id.

After any data change, in the same session:
1. `npm run analytics`. Never skip it: stale charts travel into other people's slides.
2. README banner: `python3 scripts/readme-card/make_card.py`, then the screenshot step in that script's docstring
   (writes `public/sdl-landscape-card.png`).
3. Update the README lab lists and counts in all five READMEs (en, zh-Hans, zh-Hant, ja, ko).
4. `npm test`, commit, then build, deploy, verify (above). Close the issue with a short curation note.

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
