// Small-phone fit check (2026-10-25): on the map page the shell's header and
// footer are glass bars over the map frame, so anything the map draws must sit
// in the band between them. For each viewport this opens the page as a
// first-time visitor and checks that the welcome card and its button, and then
// every visible map control, lie inside that band and inside the screen.
// Exits 1 on any miss; screenshots go to scripts/qa/out/<label>/.
//   node scripts/qa/small-phones.mjs --base http://127.0.0.1:4321 [--label small-phones]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, arr) =>
  a.startsWith('--') ? [[a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : []));
const BASE = (args.base || 'http://127.0.0.1:4321').replace(/\/$/, '');
const OUT = resolve('scripts/qa/out', args.label || 'small-phones'); mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const VIEWPORTS = [[320, 568], [360, 640], [375, 667], [390, 844], [667, 375]];
const CONTROLS = '#sdl-story-play, .zoom-ctl button, .msheet-tab, .msheet-grip, .msheet-chip, .msheet-ico';

// The fewest elements each step must find, so a renamed selector fails loudly
// instead of passing on nothing: the card and its button; then Play, reset,
// two tabs, the grip, three chips and three icons.
const MIN_CARD = 2, MIN_CONTROLS = 11;

// Runs in the map frame: the band between the shell bars, how many elements
// were checked, and which of them leave the band.
const OUTSIDE = (sel) => {
  const css = getComputedStyle(document.documentElement);
  const top = parseFloat(css.getPropertyValue('--shell-top')) || 0;
  const bottom = innerHeight - (parseFloat(css.getPropertyValue('--shell-bottom')) || 0);
  const shown = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const els = [...document.querySelectorAll(sel)].filter(shown);
  const misses = els.flatMap((el) => {
    const r = el.getBoundingClientRect();
    const name = el.id || el.className.split(' ')[0] || el.tagName;
    return r.top < top - 1 || r.bottom > bottom + 1 || r.left < -1 || r.right > innerWidth + 1
      ? [`${name} at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} (band ${top}–${bottom}, width ${innerWidth})`] : [];
  });
  return { checked: els.length, top, bottom, misses };
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let misses = 0;
for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA });
  // A first visit, but without the tour, so no tip hides a control on purpose.
  await ctx.addInitScript(() => { try { localStorage.setItem('sdlmap.tourDone', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'load' });
  const frame = () => p.frames().find((f) => f.url().includes('map-legacy'));
  await p.waitForFunction(() => { const f = document.getElementById('sdl-iframe'); return f && f.contentDocument && f.contentDocument.querySelector('.wm-backdrop.is-open'); }, null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const card = await frame().evaluate(OUTSIDE, '.wm-card, .wm-cta');
  await p.screenshot({ path: `${OUT}/${w}x${h}-welcome.png` });
  // A DOM click: a real tap fails exactly when the button sits under a bar, which is what the check reports.
  await frame().evaluate(() => document.querySelector('.wm-cta').click());
  await p.waitForFunction(() => { const d = document.getElementById('sdl-iframe').contentDocument; return !d.body.classList.contains('arriving'); }, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  const chrome = await frame().evaluate(OUTSIDE, CONTROLS);
  await p.screenshot({ path: `${OUT}/${w}x${h}-map.png` });
  for (const [what, res, min] of [['welcome card', card, MIN_CARD], ['map controls', chrome, MIN_CONTROLS]]) {
    const list = [...res.misses];
    if (res.checked < min) list.push(`only ${res.checked} elements found, expected at least ${min}`);
    if (res.top === 0 || res.bottom === h) list.push(`shell bars not measured (band ${res.top}–${res.bottom})`);
    console.log(`${list.length ? 'FAIL' : 'ok  '} ${w}×${h} ${what}: ${res.checked} checked, band ${res.top}–${res.bottom}${list.length ? '\n       ' + list.join('\n       ') : ''}`);
    misses += list.length;
  }
  await ctx.close();
}
await browser.close();
process.exit(misses ? 1 : 0);
