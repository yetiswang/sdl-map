# SDL Map

Interactive map of Self-Driving Lab initiatives worldwide — national consortia, academic groups, commercial vendors, and lab-OS platforms. Rebuilt as a multilingual Astro static site.

**Live:** [sdl-map.discoverylabs.nl](https://sdl-map.discoverylabs.nl)

## Stack

- Astro 6.4 SSG, 4 languages (EN root, `/zh/`, `/ja/`, `/ko/`)
- 4 views per language: map, list, timeline, entry detail
- The interactive globe is the original single-file map served at `/map-legacy.html` and embedded as an iframe in `index.astro`. Translation, theme propagation, and the floating clear button are wired by `public/map-i18n.js`.
- List view runs a client-side card filter: the search input matches name, organisation, city, country (English code + translated), tier, maturity, domain, and investment label
- Welcome modal text is per-language, sourced from public information, with a link to this repository

## Local development

```bash
npm install
npm run dev       # http://localhost:4321/
npm run build     # static output in dist/
npm run preview   # serves the build
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the Astro site and deploys `dist/` to GitHub Pages. The custom domain (`sdl-map.discoverylabs.nl`) is set via the `CNAME` file in `public/`.

## Data

Pin data is in `src/data/sdl_data.json` (74 entries). Country names are in `src/i18n/countries.json`. Chinese SDL entries get verified Chinese names from `src/i18n/china-names.json`.

Each entry:

```ts
{
  id: "aria",
  name: "UK ARIA AI Scientists",
  org: "ARIA",
  city: "London",
  country: "UK",
  flag: "🇬🇧",
  lat: 51.51, lon: -0.13,
  tier: "national" | "academic" | "commercial" | "labos",
  domain: "cross-domain" | "materials" | "chemistry" | ...,
  maturity: "operational" | "prototype" | "concept" | "industrial",
  charact: "single-technique" | "multi-technique" | "advanced-multimodal" | ...,
  ai: "strong" | "partial" | "planned" | "none",
  scale: "national",
  invest: 8,                     // estimated millions
  investLabel: "£6M",
  url: "https://aria.org.uk/",
  sources: ["..."]
}
```

## Contributing

Corrections and additions welcome — open an issue or PR, or reach the maintainer via GitHub.

## License

MIT.
