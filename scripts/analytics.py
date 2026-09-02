#!/usr/bin/env python3.13
"""Build the SDL analytics chart pack from src/data/sdl_data.json.

Run before deploying whenever the dataset changed:
    npm run analytics        (or: python3.13 scripts/analytics.py)

Writes SVG+PNG per chart to public/analytics/ plus sdl-analytics.zip
(charts + README). Light theme, Inter, site tier accents (converted from
the oklch tokens in public/tokens.css, light variant). Chart discipline:
neutral ink bars, recessive gridlines, gold reserved for growth.
"""
import json
import math
import zipfile
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "analytics"
DATA = json.loads((ROOT / "src" / "data" / "sdl_data.json").read_text())
TODAY = date.today().isoformat()


def oklch_hex(L, C, H):
    """oklch() token value -> sRGB hex (Ottosson OKLab matrices)."""
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (
        +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )
    def gamma(u):
        u = max(0.0, min(1.0, u))
        return 12.92 * u if u <= 0.0031308 else 1.055 * u ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{round(gamma(u) * 255):02x}" for u in rgb)


# Light-theme tokens (public/tokens.css [data-theme="light"])
TIER = {
    "national": oklch_hex(0.58, 0.18, 85),
    "academic": oklch_hex(0.55, 0.18, 220),
    "commercial": oklch_hex(0.55, 0.22, 25),
    "labos": oklch_hex(0.55, 0.18, 300),
}
GOLD = TIER["national"]
INK, INK2, INK3 = "#16181d", "#4a4f57", "#8a8f96"
BAR = "#c9cdd3"          # neutral bar — colour never carries meaning here
GRID = "#e8eaed"

plt.rcParams.update({
    "font.family": ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
    "svg.fonttype": "none",          # keep text as text in SVGs
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "axes.edgecolor": "white",
    "text.color": INK,
    "axes.labelcolor": INK2,
    "xtick.color": INK3,
    "ytick.color": INK2,
})

TIER_LABEL = {
    "national": "National / Consortium",
    "academic": "Academic / Institution",
    "commercial": "Commercial / Industrial",
    "labos": "Lab OS / Orchestration",
}
MATURITY_ORDER = ["concept", "prototype", "operational", "industrial"]
MATURITY_LABEL = {
    "concept": "Concept / Proposal", "prototype": "Prototype",
    "operational": "Operational", "industrial": "Industrial scale",
}
AI_ORDER = ["strong", "partial", "planned", "none"]
AI_LABEL = {"strong": "Strong (closed loop)", "partial": "Partial",
            "planned": "Planned", "none": "None"}
DOMAIN_LABEL = {
    "materials": "Materials", "chemistry": "Chemistry", "batteries": "Batteries",
    "energy": "Energy / P2X", "drug-discovery": "Drug discovery",
    "biology": "Biology", "cross-domain": "Cross-domain",
    "orchestration": "Orchestration", "biomaterials": "Biomaterials",
}

written = []


def finish(fig, ax, name, title, sub):
    ax.set_title(title, fontsize=15, fontweight=650, color=INK, loc="left", pad=30)
    ax.text(0, 1.022, sub, fontsize=8.5, color=INK3,
            transform=ax.transAxes, ha="left", va="bottom")
    fig.text(0.99, 0.015, f"sdl-map.discoverylabs.nl · {len(DATA)} initiatives · {TODAY}",
             fontsize=7.5, color=INK3, ha="right")
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    for ext in ("svg", "png"):
        p = OUT / f"{name}.{ext}"
        fig.savefig(p, dpi=200, bbox_inches="tight", facecolor="white")
        written.append(p)
    plt.close(fig)


def hbar(name, title, sub, pairs, colors=None, annotate=True):
    labels = [p[0] for p in pairs]
    values = [p[1] for p in pairs]
    fig, ax = plt.subplots(figsize=(8, max(2.6, 0.42 * len(pairs) + 1.4)))
    y = range(len(pairs))
    ax.barh(y, values, height=0.62, color=colors or BAR, zorder=3)
    ax.set_yticks(list(y), labels, fontsize=10)
    ax.invert_yaxis()
    ax.xaxis.grid(True, color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)
    if annotate:
        for yi, v in zip(y, values):
            ax.text(v + max(values) * 0.015, yi, str(v), va="center",
                    fontsize=9, color=INK3)
        ax.set_xlim(0, max(values) * 1.09)
        ax.set_xticks([])
    finish(fig, ax, name, title, sub)


def count_by(key):
    out = {}
    for d in DATA:
        out[d[key]] = out.get(d[key], 0) + 1
    return out


OUT.mkdir(parents=True, exist_ok=True)

# 1 — country distribution
cc = sorted(count_by("country").items(), key=lambda kv: (-kv[1], kv[0]))
hbar("country-distribution", "Self-driving lab initiatives by country",
     "Curated public landscape — one pin per initiative, not per instrument",
     cc)

# 2 — tier distribution (the one chart where colour = the site's tier accents)
tc = count_by("tier")
pairs = [(TIER_LABEL[t], tc.get(t, 0)) for t in ["national", "academic", "commercial", "labos"]]
hbar("tier-distribution", "Initiatives by type",
     "Tier colours as on the map", pairs,
     colors=[TIER[t] for t in ["national", "academic", "commercial", "labos"]])

# 3 — domain distribution
dc = sorted(count_by("domain").items(), key=lambda kv: (-kv[1], kv[0]))
hbar("domain-distribution", "Initiatives by domain",
     "Primary application domain per initiative",
     [(DOMAIN_LABEL.get(k, k), v) for k, v in dc])

# 4 — maturity
mc = count_by("maturity")
hbar("maturity-distribution", "Initiatives by maturity",
     "Self-declared or literature-derived stage",
     [(MATURITY_LABEL[m], mc.get(m, 0)) for m in MATURITY_ORDER])

# 5 — AI readiness
ac = count_by("ai")
hbar("ai-readiness", "AI in the loop",
     "Degree of AI-driven closed-loop operation",
     [(AI_LABEL[a], ac.get(a, 0)) for a in AI_ORDER if ac.get(a, 0) > 0])

# 6 — growth by start year: gold additions + ink cumulative line
years = sorted(y for y in count_by("start") if isinstance(y, int) and y >= 2014)
adds = {y: sum(1 for d in DATA if d["start"] == y) for y in years}
pre = sum(1 for d in DATA if not (isinstance(d["start"], int) and d["start"] >= 2014))
cum, running = [], pre
for y in years:
    running += adds[y]
    cum.append(running)
fig, ax = plt.subplots(figsize=(8, 4.4))
ax.bar(years, [adds[y] for y in years], color=GOLD, width=0.62, zorder=3,
       label="New initiatives")
ax.plot(years, cum, color=INK2, linewidth=1.6, marker="o", markersize=3.5,
        zorder=4, label="Cumulative")
ax.text(years[-1], cum[-1] + 3, str(cum[-1]), ha="center", fontsize=9, color=INK2)
ax.yaxis.grid(True, color=GRID, linewidth=0.8, zorder=0)
ax.set_axisbelow(True)
ax.tick_params(length=0)
ax.set_xticks(years, [str(y) for y in years], fontsize=9, rotation=45)
ax.legend(frameon=False, fontsize=9, loc="upper left", labelcolor=INK2)
finish(fig, ax, "growth-by-year", "Growth of the SDL landscape",
       f"By reported start year · {pre} pre-2014 or undated initiatives included in the cumulative baseline")

# 7 — investment histogram (reported subset only)
inv = [d["invest"] for d in DATA if isinstance(d.get("invest"), (int, float)) and d["invest"] > 0]
bins = [0, 5, 10, 25, 50, 100, 250, 500, 1500]
counts = [sum(1 for v in inv if lo < v <= hi) for lo, hi in zip(bins, bins[1:])]
blabels = [f"{lo}–{hi}" for lo, hi in zip(bins, bins[1:])]
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar(range(len(counts)), counts, color=BAR, width=0.62, zorder=3)
ax.set_xticks(range(len(counts)), blabels, fontsize=9)
ax.set_xlabel("Reported programme investment, $M (approx.)", fontsize=9.5)
ax.yaxis.grid(True, color=GRID, linewidth=0.8, zorder=0)
ax.set_axisbelow(True)
ax.tick_params(length=0)
finish(fig, ax, "investment-histogram", "Reported investment",
       f"{len(inv)} of {len(DATA)} initiatives report a figure — treat as indicative, not audited")

# README + zip
n_countries = len(count_by("country"))
readme = f"""SDL LANDSCAPE — ANALYTICS PACK
{len(DATA)} initiatives · {n_countries} countries · generated {TODAY}
https://sdl-map.discoverylabs.nl · data + charts MIT — cite the map when reusing

Charts (each as .svg vector + .png raster):
  country-distribution     initiatives per country
  tier-distribution        national / academic / commercial / lab-OS split
  domain-distribution      primary application domain
  maturity-distribution    concept -> prototype -> operational -> industrial
  ai-readiness             degree of AI-driven closed-loop operation
  growth-by-year           new + cumulative initiatives by start year
  investment-histogram     reported programme investment (partial coverage)

Regenerated from src/data/sdl_data.json on every dataset update.
Full dataset downloads: /sdl-data.txt · /sdl-data.csv · /sdl-data.xlsx
"""
(OUT / "README.txt").write_text(readme)
written.append(OUT / "README.txt")

zip_path = OUT / "sdl-analytics.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for p in written:
        z.write(p, p.name)
print(f"wrote {len(written)} files + {zip_path.name} ({zip_path.stat().st_size // 1024} KB)")
