#!/usr/bin/env python3
"""Regenerate the README hero banner (public/sdl-landscape-card.png).

The banner is feature-card.template.html (1200x627 design) filled with live
counts from src/data/sdl_data.json, plus five screenshots of the live site in
shots/. Recovered from the 2026-08-24 LinkedIn-announcement session and made
reproducible 2026-09-09.

Usage:
    python3 scripts/readme-card/make_card.py          # fills template -> build/
    # then screenshot build/feature-card@2x.html at viewport 2400x1254
    # (the @2x variant zooms the page 2x; any Chromium screenshot tool works):
    #   cd scripts/readme-card/build && python3 -m http.server 8899
    #   npx -y playwright screenshot --viewport-size=2400,1254 \
    #       http://localhost:8899/feature-card@2x.html ../../../public/sdl-landscape-card.png

Refreshing the shots/ (only needed when the site UI changes materially):
    All from https://sdl-map.discoverylabs.nl/ in LIGHT theme
    (localStorage sdl-map-theme=light), viewport 1600x1000, site header
    excluded (crop y>=79):
    - globe.png         world globe view (#z-reset then #z-out x5), map area crop
    - dp-card.png       click pin g[data-id="dpt"],   crop #sdl-sheet top 372px
    - capex-card.png    click pin g[data-id="capex"], crop #sdl-sheet top 372px
    - ac-card.png       click pin g[data-id="accel"], crop #sdl-sheet top 372px
    - timelinechart.png /timeline/ page, crop section.tl-chartwrap
"""
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

data = json.load(open(os.path.join(ROOT, 'src', 'data', 'sdl_data.json')))
n_entries = len(data)
n_countries = len(set(e['country'] for e in data))

template = open(os.path.join(HERE, 'feature-card.template.html')).read()
filled = template.replace('{{N_ENTRIES}}', str(n_entries)).replace('{{N_COUNTRIES}}', str(n_countries))

build = os.path.join(HERE, 'build')
os.makedirs(build, exist_ok=True)
open(os.path.join(build, 'feature-card.html'), 'w').write(filled)
open(os.path.join(build, 'feature-card@2x.html'), 'w').write(
    filled.replace('</style>', 'html { zoom: 2; }\n</style>'))
shutil.copytree(os.path.join(HERE, 'shots'), os.path.join(build, 'shots'), dirs_exist_ok=True)
print(f'build ready: {n_entries} initiatives, {n_countries} countries')
print('now screenshot build/feature-card@2x.html at 2400x1254 (see module docstring)')
