#!/usr/bin/env python3
"""Brand kit for the Global Self-Driving Lab Landscape: mark, lockups, favicon set.

The mark is the sister of the DiscoveryLabNL orbit logo (the site is a DiscoveryLabNL project):
the same open navy ring with its satellite dot, and a map pin in Dutch red where the parent logo
has its red core. The wordmark is Avenir Next (Demi for the name, Medium for the motto), outlined
to paths so the files need no font to render.

Writes, from the repo root:
    public/favicon.svg, favicon.ico (16/32/48)      navy tile, white ring, red pin (works on light and dark tab bars)
    public/apple-touch-icon.png (180), icon-192.png, icon-512.png   full-bleed navy tile for home screens
    public/site.webmanifest icons point at the two icon-*.png files
    public/brand/sdl-landscape-mark[-on-dark].svg|png            the mark alone
    public/brand/sdl-landscape-logo[-on-dark].svg|png            mark + name + motto
    public/brand/sdl-landscape-logo-compact[-on-dark].svg|png    mark + name
    public/brand/sdl-landscape-icon.png (512)                    rounded tile, used by the READMEs

Run on macOS (Avenir Next ships with the system): `python3 scripts/brand/make_logo.py`.
Needs fontTools (`pip install fonttools`), HarfBuzz's `hb-shape` and `rsvg-convert` (both via Homebrew).
The outputs are committed, so nobody else has to run this.
"""
import json
import math
import os
import struct
import subprocess

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
BRAND = os.path.join(PUBLIC, 'brand')

TTC = '/System/Library/Fonts/Avenir Next.ttc'
IDX = {'bold': 0, 'demi': 2, 'medium': 5, 'regular': 7}
FONTS = {k: TTFont(TTC, fontNumber=v) for k, v in IDX.items()}

INK, RED, GREY = '#13263F', '#AE1C28', '#5A6A7E'          # navy ink, Dutch-flag red, slate (as DiscoveryLabNL)
INK_D, RED_D, GREY_D = '#FFFFFF', '#F0525A', '#B8C4D2'    # on dark
TILE = '#0E1E33'                                          # icon tile
KERN = {('L', 'a'): -48, ('r', 'y'): -14, ('o', 'v'): -14, ('v', 'e'): -12, ('y', 'L'): -6}  # optical tweaks, font units

NAME_A, NAME_B = 'Global Self-Driving Lab', 'Landscape'
MOTTO = 'AUTONOMOUS SCIENCE, MAPPED AND WATCHED'


# ------------------------------------------------------------------ type: shape with HarfBuzz, outline with fontTools
def shape(weight, text):
    r = subprocess.run(['hb-shape', f'--face-index={IDX[weight]}', '--output-format=json', TTC, text],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def run(weight, text, size, x, y, tracking=0):
    """Outline `text` with its baseline at (x, y). Returns ([(glyph, [(path, bounds), ...])], advance px)."""
    gs = FONTS[weight].getGlyphSet()
    s = size / 1000
    out, cx, prev = [], 0, None
    for g in shape(weight, text):
        name = g['g']
        if prev:
            cx += KERN.get((prev, name), 0)
        rec = RecordingPen()
        gs[name].draw(rec)
        contours, cur = [], []
        for op, args in rec.value:
            cur.append((op, args))
            if op in ('closePath', 'endPath'):
                contours.append(cur)
                cur = []
        paths = []
        for c in contours:
            sp, bp = SVGPathPen(gs), BoundsPen(gs)
            tp, tb = TransformPen(sp, (s, 0, 0, -s, x + cx * s, y)), TransformPen(bp, (s, 0, 0, -s, x + cx * s, y))
            for op, args in c:
                getattr(tp, op)(*args)
                getattr(tb, op)(*args)
            paths.append((sp.getCommands(), bp.bounds))
        out.append((name, paths))
        cx += g['ax'] + tracking
        prev = name
    return out, (cx - tracking) * s


def ink_bounds(glyphs):
    bs = [b for _, ps in glyphs for _, b in ps if b]
    return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)


def svg_paths(glyphs, fill):
    return f'<path fill="{fill}" d="{" ".join(p for _, ps in glyphs for p, _ in ps)}"/>'


# ------------------------------------------------------------------ the mark: orbit ring, satellite, pin
def mark(cx, cy, M, dark=False, bold=False, ink=None, red=None):
    """The mark in a box M wide centred on (cx, cy). bold = icon weights for 16 to 64 px."""
    ink = ink or (INK_D if dark else INK)
    red = red or (RED_D if dark else RED)
    r, sw = 0.40 * M, (0.105 if bold else 0.072) * M
    sat, gap = math.radians(-40), math.radians(30)
    a0, a1 = sat + gap, sat - gap + 2 * math.pi
    p0 = (cx + r * math.cos(a0), cy + r * math.sin(a0))
    p1 = (cx + r * math.cos(a1), cy + r * math.sin(a1))
    sx, sy = cx + r * math.cos(sat), cy + r * math.sin(sat)
    R = (0.175 if bold else 0.155) * M
    head_cy, tip_y = cy - 0.07 * M, cy + 0.245 * M
    hole = (0.06 if bold else 0.055) * M
    a = math.acos(R / (tip_y - head_cy))
    px, py = R * math.sin(a), R * math.cos(a)
    return (f'<path d="M{p0[0]:.2f},{p0[1]:.2f} A{r:.2f},{r:.2f} 0 1 1 {p1[0]:.2f},{p1[1]:.2f}" fill="none" '
            f'stroke="{ink}" stroke-width="{sw:.2f}" stroke-linecap="round"/>'
            f'<circle cx="{sx:.2f}" cy="{sy:.2f}" r="{0.085 * M:.2f}" fill="{ink}"/>'
            f'<path d="M{cx - px:.2f},{head_cy + py:.2f} A{R:.2f},{R:.2f} 0 1 1 {cx + px:.2f},{head_cy + py:.2f} '
            f'L{cx:.2f},{tip_y:.2f} Z M{cx - hole:.2f},{head_cy:.2f} a{hole:.2f},{hole:.2f} 0 1 0 {2 * hole:.2f},0 '
            f'a{hole:.2f},{hole:.2f} 0 1 0 {-2 * hole:.2f},0 Z" fill="{red}" fill-rule="evenodd"/>')


# ------------------------------------------------------------------ wordmark and lockup
def wordmark(x, y, size, dark=False, tagline=True):
    """'Global Self-Driving Lab' in ink, 'Landscape' in slate, the motto letterspaced below."""
    ink, grey = (INK_D, GREY_D) if dark else (INK, GREY)
    trk = -8
    a, wa = run('demi', NAME_A, size, x, y, trk)
    space = shape('demi', ' ')[0]['ax'] * size / 1000
    b, _ = run('demi', NAME_B, size, x + wa + space, y, trk)
    svg = svg_paths(a, ink) + svg_paths(b, grey)
    x0, y0, x1, y1 = ink_bounds(a + b)
    if tagline:
        tsize = size * 0.22
        nat, _ = run('medium', MOTTO, tsize, 0, 0, 0)
        nb = ink_bounds(nat)
        # span the name like the parent logo's tagline, but never track wider than 0.30 em
        trk_t = min(((x1 - x0) - (nb[2] - nb[0])) / (len(MOTTO) - 1) / (tsize / 1000), 300)
        desc = ink_bounds(run('demi', 'g', size, 0, 0)[0])[3]
        ty = y + desc + size * 0.075 + tsize * 0.708
        t, _ = run('medium', MOTTO, tsize, 0, ty, trk_t)
        t, _ = run('medium', MOTTO, tsize, x0 - ink_bounds(t)[0], ty, trk_t)
        svg += svg_paths(t, grey)
        y1 = max(y1, ink_bounds(t)[3])
    return svg, (x0, y0, x1, y1)


def lockup(x, y, size, dark=False, tagline=True):
    """Mark left of the wordmark; the ring spans cap top to tagline bottom, as in the parent lockup."""
    _, (_, _, _, y1) = wordmark(0, 0, size, dark, tagline)
    cap_top = -0.708 * size
    block_bottom = y1 if tagline else 0.0
    M = (block_bottom - cap_top) * (1.18 if tagline else 1.5)
    mid = (cap_top + block_bottom) / 2
    gap = (0.30 if tagline else 0.24) * M
    m = mark(x + M / 2, y + mid, M, dark)
    svg, bb = wordmark(x + M + gap, y, size, dark, tagline)
    return m + svg, (x, min(bb[1], y + mid - M / 2), bb[2], max(bb[3], y + mid + M / 2))


# ------------------------------------------------------------------ icons
def icon_svg(size, rounded=True, pad=0.10):
    """Navy tile with the on-dark mark at icon weights."""
    rx = f' rx="{0.22 * size:.2f}"' if rounded else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}"{rx} fill="{TILE}"/>'
            f'{mark(size / 2, size / 2, size * (1 - 2 * pad), dark=True, bold=True)}</svg>\n')


def write_ico(path, pngs):
    """PNG-in-ICO container: one directory entry per (size, png bytes)."""
    header = struct.pack('<HHH', 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, blobs = b'', b''
    for size, data in pngs:
        entries += struct.pack('<BBBBHHII', size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
        blobs += data
    with open(path, 'wb') as f:
        f.write(header + entries + blobs)


def render(svg_path, png_path, width):
    subprocess.run(['rsvg-convert', '-w', str(width), svg_path, '-o', png_path], check=True)


def save_svg(path, body, bb, pad_ratio=0.06):
    x0, y0, x1, y1 = bb
    pad = (y1 - y0) * pad_ratio
    vb = f'{x0 - pad:.2f} {y0 - pad:.2f} {x1 - x0 + 2 * pad:.2f} {y1 - y0 + 2 * pad:.2f}'
    with open(path, 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>\n')


def main():
    os.makedirs(BRAND, exist_ok=True)
    # brand files, light and on dark (on-dark files are transparent with white ink, for dark slides and pages)
    for dark in (False, True):
        sfx = '-on-dark' if dark else ''
        for name, (body, bb), width in (
                (f'sdl-landscape-logo{sfx}', lockup(0, 0, 100, dark), 2400),
                (f'sdl-landscape-logo-compact{sfx}', lockup(0, 0, 100, dark, tagline=False), 2400),
                (f'sdl-landscape-mark{sfx}', (mark(50, 50, 100, dark), (0, 0, 100, 100)), 1200)):
            svg = os.path.join(BRAND, f'{name}.svg')
            save_svg(svg, body, bb)
            render(svg, os.path.join(BRAND, f'{name}.png'), width)
    # favicon.svg + favicon.ico (rounded tile), README icon
    fav = os.path.join(PUBLIC, 'favicon.svg')
    with open(fav, 'w') as f:
        f.write(icon_svg(64))
    pngs = []
    for size in (16, 32, 48):
        tmp = os.path.join(BRAND, f'.favicon-{size}.png')
        render(fav, tmp, size)
        with open(tmp, 'rb') as f:
            pngs.append((size, f.read()))
        os.remove(tmp)
    write_ico(os.path.join(PUBLIC, 'favicon.ico'), pngs)
    render(fav, os.path.join(BRAND, 'sdl-landscape-icon.png'), 512)
    # home-screen icons: full bleed, a little more padding because the OS rounds the corners
    full = os.path.join(BRAND, '.icon-full.svg')
    with open(full, 'w') as f:
        f.write(icon_svg(64, rounded=False, pad=0.14))
    for name, size in (('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)):
        render(full, os.path.join(PUBLIC, name), size)
    os.remove(full)
    with open(os.path.join(PUBLIC, 'site.webmanifest'), 'w') as f:
        json.dump({
            'name': 'Global Self-Driving Lab Landscape',
            'short_name': 'SDL Landscape',
            'start_url': '/',
            'display': 'standalone',
            'background_color': TILE,
            'theme_color': TILE,
            'icons': [{'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                      {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png'}],
        }, f, indent=2)
        f.write('\n')
    print('inline mark for the welcome card (currentColor ring, token red pin):')
    inline = mark(50, 50, 100, ink='currentColor', red='TOKEN').replace('fill="TOKEN"', 'class="wm-logo-pin"')
    print(f'<svg class="wm-logo" viewBox="6 6 88 88" aria-hidden="true" focusable="false">{inline}</svg>')
    print('ok:', sorted(os.listdir(BRAND)))


if __name__ == '__main__':
    main()
