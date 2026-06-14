# DESIGN.md — SDL Map visual canon

The persistent design contract for `sdl-map.discoverylabs.nl`. Read this before any UI change so edits stay coherent. Tokens live in `public/tokens.css` (single source, shared by the Astro shell and the iframe map). Do not redefine colours, type, or surfaces inline.

## Voice
Restrained editorial, not a dashboard and not a marketing page. It is a curated reference map for a serious scientific-infrastructure audience (NWO LSRI, PIs, funders). Calm dark canvas, generous spacing, monospace for metadata, sans for content. No gradients-as-decoration, no glassmorphism, no drop-shadow stacks, no animated flourish that does not carry meaning. When in doubt, remove.

## Colour (tokens, `public/tokens.css`)
Dark is the default; `[data-theme="light"]` overrides the same token names. All colours are `oklch` for perceptual consistency across themes.

- Surfaces: `--bg` (canvas), `--bg-2` (cards/inputs), `--bg-3` (hover), plus `--surface-overlay` / `--surface-deep` / `--surface-hover` for sheets and popups.
- Ink (text): `--ink` (primary), `--ink-2` (secondary), `--ink-3` (muted/labels), `--ink-4` (faint).
- Lines: `--rule` (borders), `--rule-2` (subtle). Map geography: `--land`, `--land-edge`, `--graticule`.
- Tier accents (the only saturated colours; one per SDL category, never reused for UI chrome):
  - `--c-national` gold · `--c-academic` blue · `--c-commercial` red · `--c-labos` violet.

## Type
- Sans: **Inter** (variable, weights 400–700). Body and headings.
- Mono: **IBM Plex Mono** (400/500/600). Labels, eyebrows, stats, counts, datestamps, footer.
- Both are self-hosted (`public/fonts/`, declared in `public/fonts.css`). No Google Fonts CDN — keeps visitor IPs off third parties (EU privacy) and avoids a render-blocking external request.
- Uppercase + letter-spacing (~0.16–0.22em) for mono eyebrows/labels. `font-variant-numeric: tabular-nums` for stat figures.

## Layout
- One visible viewport on the map view: header + map + footer add up to `100svh`/`100dvh` (mobile URL-bar aware), no page scroll.
- Header collapses to a hamburger drawer below 1024px; stat chips drop below 1100px first.
- List/timeline pages: centered `max-width:1100px` column; responsive card grid `minmax(260px,1fr)`.

## Accessibility
- Pinch-zoom must stay enabled. The viewport meta is `width=device-width, initial-scale=1.0, viewport-fit=cover` only. Never add `user-scalable=no` or `maximum-scale`.
- Keep tier-colour meaning backed by text labels (colour is never the only signal).

## Architecture invariants
- **One dataset.** `src/data/sdl_data.json` is the single source of truth. The Astro pages import it directly; the iframe map loads it via the generated `/sdl-data.js` endpoint. Never hand-maintain a second copy inside `map-legacy.html`.
- **No third-party runtime origins.** d3, topojson, the world/China geo data, and the fonts are all vendored under `public/vendor/` and `public/fonts/`. The site must work behind a firewall and inside China.
- **i18n at build where possible.** UI strings come from `src/i18n/`. The Simplified→Traditional dictionary is built once at build time (UnifiedLayout frontmatter), not per page load.
- **Tokens are shared.** Any new colour/type/surface goes in `public/tokens.css`, used by both the shell and the iframe. No inline hex/oklch in components.

## Anti-patterns (do not introduce)
Glassmorphism / liquid-glass, neon glows, card-with-left-border-accent callouts, multiple competing border styles in one view, decorative gradients, motion without meaning, Google Fonts or any CDN dependency, a second copy of the SDL data.
