# SDL Landscape Map

Interactive global map of Self-Driving Lab initiatives — academic groups, national consortia, commercial labs. SVG-on-canvas orthographic globe with d3-geo projection, label-relaxation placement, halo-based hit-testing, mobile-friendly progressive label disclosure.

**Live (GitHub Pages):** https://yetiswang.github.io/sdl-map/
**Custom domain (when wired):** https://sdl-map.discoverylabs.nl/

## Canonical source

This repo is the canonical source for the SDL map. The file
[`yetiswang/LSRI-presentation/sdl-map.html`](https://github.com/yetiswang/LSRI-presentation/blob/main/sdl-map.html) is a mirror, kept in sync by a GitHub Action whenever this repo's `index.html` changes on `main` (`.github/workflows/sync-to-lsri-presentation.yml`).

To make the mirror push work, the secret `LSRI_MIRROR_TOKEN` must be set on this repo with a PAT (classic, `repo` scope) that has write access to `yetiswang/LSRI-presentation`. See "Sync setup" below.

## Sync setup (one-time)

1. Create a fine-grained or classic PAT at https://github.com/settings/tokens with `repo` scope and an expiry you can live with.
2. In this repo: Settings → Secrets and variables → Actions → New repository secret. Name `LSRI_MIRROR_TOKEN`, value the PAT.
3. The next push to `main` that touches `index.html` will trigger `Sync to LSRI-presentation` (visible under the Actions tab).

## Local development

```bash
# clone
git clone https://github.com/yetiswang/sdl-map.git
cd sdl-map

# serve at http://localhost:8000/
python3 -m http.server 8000
```

Open `http://localhost:8000/` (loads `index.html`). Edit in place; commit and push to deploy.

## Data

Pin data is inline in `index.html` (look for `const DATA = [...]`). Each entry:

```js
{
  id: "aria",                    // short ID
  name: "UK ARIA AI Scientists", // display name (long form)
  org: "ARIA",                   // organisation
  city: "London",
  country: "UK",
  flag: "🇬🇧",
  lat: 51.51, lon: -0.13,
  tier: "national",              // national | commercial | academic | labos
  domain: "cross-domain",        // chemistry | materials | energy | biology | ...
  maturity: "prototype",         // operational | prototype | concept
  charact: "single-technique",   // synthesis-only | single-technique | multi-technique | ...
  ai: "strong",                  // strong | partial | planned
  scale: "national",
  invest: 8,                     // estimated investment in millions (drives salience)
  investLabel: "£6M",
  url: "https://aria.org.uk/",
  sources: ["https://aria.org.uk/funding-opportunities/", ...]
}
```

## License

Source available. Content (pin entries, descriptions) reflects public information about the listed initiatives as of compile time.
