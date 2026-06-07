# SDL Landscape Map

Interactive global map of Self-Driving Lab initiatives — academic groups, national consortia, commercial labs. SVG-on-canvas orthographic globe with d3-geo projection, label-relaxation placement, halo-based hit-testing, mobile-friendly progressive label disclosure.

**Live (GitHub Pages):** https://yetiswang.github.io/sdl-map/
**Custom domain (when wired):** https://sdl-map.discoverylabs.nl/

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
