#!/usr/bin/env node
// Map QA audit — measures what the eye complains about, so a change can be
// judged by numbers before screenshots.
//
//   node scripts/qa/map-audit.mjs --base http://127.0.0.1:4321 --label baseline
//   node scripts/qa/map-audit.mjs --base https://sdl-map.discoverylabs.nl --label live
//
// Drives the installed Google Chrome through playwright-core (devDependency;
// no browser download). Two devices (phone 390×844 touch, desktop 1440×900),
// four views each (default, zoom2, world, deep). For every view it records:
//   controls  — visible overlaid buttons: count, smallest side, pairwise
//               overlaps, share of the right edge they occupy
//   pins      — visible markers, cluster discs, labels, label/label overlaps,
//               label-over-other-pin overlaps, pin/pin overlaps, core sizes
// and saves a JPEG. Output: scripts/qa/out/<label>/{audit.json, *.jpg}.
//
// The numbers are the acceptance gates in the 2026-09-20 redesign plan
// (vault: 30-Projects/SDL-Map/2026-09-20-mobile-map-redesign-plan.md).

import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
  a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const BASE = (args.base || 'http://127.0.0.1:4321').replace(/\/$/, '');
const LABEL = args.label || new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const OUT = resolve('scripts/qa/out', LABEL);
const ONLY = args.device || null; // 'phone' | 'desktop'
const PERF = !!args.perf;         // --perf: frame-time + contrast pass instead of the view sweep
await mkdir(OUT, { recursive: true });

const DEVICES = {
  phone: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const CONTROL_SEL = '.zoom-ctl button, .region-nav button, .mob-toggle, .sdl-fab, .wm-reopen, #sdl-clear-floating, .msheet-grip, .msheet-chip, .msheet-action, .dpanel-head';

// Runs inside the iframe document.
const MEASURE = () => {
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const q = (s) => [...document.querySelectorAll(s)];
  const mapEl = document.getElementById('map-wrap') || document.body;
  const map = rect(mapEl);

  const ctrls = q(window.__QA_CONTROL_SEL).filter(vis).map((el) => ({ id: el.id || el.className, r: rect(el) }));
  let overlapPairs = 0; const overlapping = [];
  for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) if (ov(ctrls[i].r, ctrls[j].r)) { overlapPairs++; overlapping.push(ctrls[i].id + ' × ' + ctrls[j].id); }
  const rightCol = ctrls.filter((c) => c.r.x + c.r.w > map.x + map.w - 80);
  const ys = rightCol.map((c) => [c.r.y, c.r.y + c.r.h]).sort((a, b) => a[0] - b[0]);
  let covered = 0, cur = null;
  for (const [a, b] of ys) { if (!cur || a > cur[1]) { if (cur) covered += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b); }
  if (cur) covered += cur[1] - cur[0];

  const markers = q('.marker').filter((m) => m.style.display !== 'none' && vis(m));
  const cores = markers.map((m) => { const c = m.querySelector('.core'); const r = rect(c); return { id: m.dataset.id, r, cx: r.x + r.w / 2, cy: r.y + r.h / 2, rad: r.w / 2, dim: m.classList.contains('dim') }; })
    .filter((c) => c.r.w > 0 && c.cx > map.x && c.cx < map.x + map.w && c.cy > map.y && c.cy < map.y + map.h);
  let pinPin = 0;
  for (let i = 0; i < cores.length; i++) for (let j = i + 1; j < cores.length; j++) {
    const a = cores[i], b = cores[j]; const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    if (d < Math.min(a.rad, b.rad) * 1.2) pinPin++; // centres closer than 60% of the smaller diameter
  }
  const labels = q('.sdl-label').filter((l) => l.style.display !== 'none' && vis(l)).map((l) => ({ t: l.textContent, r: rect(l), owner: l._owner && l._owner.id }))
    .filter((l) => l.r.x + l.r.w > map.x && l.r.x < map.x + map.w && l.r.y + l.r.h > map.y && l.r.y < map.y + map.h);
  let ll = 0; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (ov(labels[i].r, labels[j].r)) ll++;
  let lp = 0; for (const l of labels) for (const c of cores) { if (c.id === l.owner) continue; const cx = Math.max(l.r.x, Math.min(c.cx, l.r.x + l.r.w)); const cy = Math.max(l.r.y, Math.min(c.cy, l.r.y + l.r.h)); if (Math.hypot(c.cx - cx, c.cy - cy) < c.rad) lp++; }
  const clusters = q('.cluster').filter((c) => c.style.display !== 'none' && vis(c)).length;
  const dia = cores.map((c) => Math.round(c.r.w * 10) / 10);
  return {
    k: window.__sdlViewK ?? null,
    map: { w: Math.round(map.w), h: Math.round(map.h) },
    controls: { count: ctrls.length, minSide: ctrls.length ? Math.round(Math.min(...ctrls.map((c) => Math.min(c.r.w, c.r.h)))) : null, overlapPairs, overlapping, rightColumnPct: Math.round(100 * covered / map.h), list: ctrls.map((c) => `${c.id}:${Math.round(c.r.x)},${Math.round(c.r.y)},${Math.round(c.r.w)}x${Math.round(c.r.h)}`) },
    pins: { visible: cores.length, clusters, labels: labels.length, labelLabelOverlaps: ll, labelPinOverlaps: lp, pinPinOverlaps: pinPin, coreDiaMin: dia.length ? Math.min(...dia) : null, coreDiaMax: dia.length ? Math.max(...dia) : null },
  };
};

// Contrast of a glass surface's text against what is actually behind it:
// average the map canvas under the element, composite the surface colour over
// it, compare with the text colour. Runs inside the iframe.
const CONTRAST = (sel, textSel) => {
  const el = document.querySelector(sel); const tx = document.querySelector(textSel || sel);
  if (!el || !tx) return null;
  const cv = document.getElementById('map-canvas'); const r = el.getBoundingClientRect(); const cr = cv.getBoundingClientRect();
  const dpr = cv.width / cr.width;
  const x = Math.max(0, Math.round((r.left - cr.left) * dpr)), y = Math.max(0, Math.round((r.top - cr.top) * dpr));
  const w = Math.max(1, Math.min(cv.width - x, Math.round(r.width * dpr))), h = Math.max(1, Math.min(cv.height - y, Math.round(r.height * dpr)));
  let px; try { px = cv.getContext('2d').getImageData(x, y, w, h).data; } catch (e) { return { error: String(e) }; }
  let R = 0, G = 0, B = 0, n = 0; for (let i = 0; i < px.length; i += 16) { R += px[i]; G += px[i + 1]; B += px[i + 2]; n++; }
  const bgCanvas = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
  // canvas is transparent where nothing is drawn → composite over the body colour
  let A = 0; for (let i = 3; i < px.length; i += 16) A += px[i]; A = A / n / 255;
  const under = [R / n * A + bgCanvas[0] * (1 - A), G / n * A + bgCanvas[1] * (1 - A), B / n * A + bgCanvas[2] * (1 - A)];
  const parse = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; if (c.startsWith('oklch')) { const cvs = document.createElement('canvas').getContext('2d'); cvs.fillStyle = c; cvs.fillRect(0, 0, 1, 1); const d = cvs.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; } const v = m.map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const sc = getComputedStyle(el), surf = parse(sc.backgroundColor) || [0, 0, 0, 0];
  const over = [0, 1, 2].map((i) => surf[i] * surf[3] + under[i] * (1 - surf[3]));
  const txt = parse(getComputedStyle(tx).color) || [255, 255, 255, 1];
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const L1 = lum(txt), L2 = lum(over); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  return { ratio: Math.round(ratio * 100) / 100, surfaceAlpha: surf[3], under: under.map(Math.round), blur: sc.backdropFilter || sc.webkitBackdropFilter };
};
// Frame intervals while the map is driven through zooms and a flight.
const PERF_RUN = async (ms) => {
  const deltas = []; let last = performance.now(); let stop = false;
  const tick = (t) => { deltas.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const zin = document.getElementById('z-in'), zout = document.getElementById('z-out');
  const t0 = performance.now(); let i = 0;
  await new Promise((res) => { const iv = setInterval(() => { (i++ % 6 < 3 ? zin : zout).click(); if (i % 9 === 0) document.getElementById('r-' + ['eu', 'us', 'ea'][(i / 9) % 3 | 0])?.click(); if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 120); });
  stop = true; await new Promise((r) => setTimeout(r, 50));
  const d = deltas.slice(5).sort((a, b) => a - b); const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))];
  return { frames: d.length, median: Math.round(q(0.5) * 10) / 10, p95: Math.round(q(0.95) * 10) / 10, max: Math.round(d[d.length - 1] * 10) / 10, over33ms: d.filter((x) => x > 33).length };
};

async function frameOf(page) {
  for (let i = 0; i < 100; i++) {
    const f = page.frames().find((fr) => fr.url().includes('map-legacy'));
    if (f) {
      const ready = await f.evaluate(() => !!(window.__sdlLastVisible && document.querySelectorAll('.marker').length)).catch(() => false);
      if (ready) return f;
    }
    await page.waitForTimeout(200);
  }
  throw new Error('map iframe never became ready');
}

const VIEWS = {
  default: async () => {},
  zoom2: async (f, p) => { for (let i = 0; i < 2; i++) { await f.evaluate(() => document.getElementById('z-in').click()); await p.waitForTimeout(500); } await p.waitForTimeout(1500); },
  world: async (f, p) => { for (let i = 0; i < 8; i++) { await f.evaluate(() => document.getElementById('z-out').click()); await p.waitForTimeout(300); } await p.waitForTimeout(1800); },
  deep: async (f, p) => { await f.evaluate(() => document.getElementById('r-eu')?.click()); await p.waitForTimeout(1600); for (let i = 0; i < 4; i++) { await f.evaluate(() => document.getElementById('z-in').click()); await p.waitForTimeout(450); } await p.waitForTimeout(1500); },
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { base: BASE, label: LABEL, at: new Date().toISOString(), devices: {} };
try {
  for (const [dev, opts] of Object.entries(DEVICES)) {
    if (ONLY && ONLY !== dev) continue;
    const ctx = await browser.newContext(opts);
    // The map plays a once-per-session arrival (≈1.4 s, names last). The audit
    // measures the settled state, so mark the session as already arrived.
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sdl-arrived', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load' });
    const frame = await frameOf(page);
    await frame.evaluate((sel) => { window.__QA_CONTROL_SEL = sel; document.getElementById('wmClose')?.click(); }, CONTROL_SEL);
    await page.waitForTimeout(900);
    report.devices[dev] = {};
    if (PERF) {
      const f0 = frame;
      const contrast = await f0.evaluate((sels) => Object.fromEntries(sels.map(([k, a, b]) => [k, (window.__qaContrast || (() => null))(a, b)])), []);
      await f0.evaluate(`window.__qaContrast = ${CONTRAST.toString()}; window.__qaPerf = ${PERF_RUN.toString()};`);
      const targets = dev === 'phone'
        ? [['sheetHead', '#msheet', '#msheet-n'], ['reset', '.zoom-ctl', '#z-reset'], ['chip', '.msheet-chip', '.msheet-chip']]
        : [['zoomCtl', '.zoom-ctl', '#z-reset'], ['region', '#r-eu', '#r-eu'], ['fab', '#sdl-export-floating', '#sdl-export-floating']];
      report.devices[dev].contrast = await f0.evaluate((ts) => Object.fromEntries(ts.map(([k, a, b]) => [k, window.__qaContrast(a, b)])), targets);
      // desktop: open a tip and measure it too
      if (dev === 'desktop') {
        const pin = await f0.evaluate(() => { const d = (window.__sdlLastVisible || []).find((x) => x._el && x._el.style.display !== 'none' && x._x > 300 && x._x < 700); if (!d) return null; const r = d._el.querySelector('.core').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
        if (pin) { const ib = await (await page.$('#sdl-iframe')).boundingBox(); await page.mouse.move(ib.x + pin.x, ib.y + pin.y); await page.waitForTimeout(350); report.devices[dev].contrast.tip = await f0.evaluate(() => window.__qaContrast('.tip', '.tip .t-name')); await page.mouse.move(ib.x + 40, ib.y + 40); }
      }
      report.devices[dev].perf = {};
      for (const mode of ['glass', 'solid']) {
        await f0.evaluate((m) => document.body.classList.toggle('no-glass', m === 'solid'), mode);
        await page.waitForTimeout(300);
        report.devices[dev].perf[mode] = await f0.evaluate((ms) => window.__qaPerf(ms), 3000);
        await f0.evaluate(() => document.getElementById('r-eu')?.click()); await page.waitForTimeout(1800);
      }
      const c = report.devices[dev].contrast, pf = report.devices[dev].perf;
      console.log(`${dev.padEnd(7)} contrast ${Object.entries(c).map(([k, v]) => k + '=' + (v && v.ratio != null ? v.ratio : '?')).join(' ')}`);
      console.log(`${dev.padEnd(7)} frames  glass: med ${pf.glass.median}ms p95 ${pf.glass.p95}ms max ${pf.glass.max}ms >33ms ${pf.glass.over33ms}/${pf.glass.frames}   solid: med ${pf.solid.median}ms p95 ${pf.solid.p95}ms max ${pf.solid.max}ms >33ms ${pf.solid.over33ms}/${pf.solid.frames}`);
      await ctx.close();
      continue;
    }
    for (const [view, act] of Object.entries(VIEWS)) {
      if (view !== 'default') { await page.reload({ waitUntil: 'load' }); const f2 = await frameOf(page); await f2.evaluate((sel) => { window.__QA_CONTROL_SEL = sel; document.getElementById('wmClose')?.click(); }, CONTROL_SEL); await page.waitForTimeout(700); }
      const f = await frameOf(page);
      await act(f, page);
      const m = await f.evaluate(MEASURE);
      report.devices[dev][view] = m;
      await page.screenshot({ path: resolve(OUT, `${dev}-${view}.jpg`), type: 'jpeg', quality: 85 });
      const c = m.controls, pn = m.pins;
      console.log(`${dev.padEnd(7)} ${view.padEnd(7)} k=${m.k == null ? '  ?' : m.k.toFixed(1).padStart(4)}  ctrls=${String(c.count).padStart(2)} min=${String(c.minSide).padStart(2)} ovl=${c.overlapPairs} rcol=${String(c.rightColumnPct).padStart(2)}%  pins=${String(pn.visible).padStart(3)} clus=${String(pn.clusters).padStart(2)} lbl=${String(pn.labels).padStart(3)} ll=${String(pn.labelLabelOverlaps).padStart(3)} lp=${String(pn.labelPinOverlaps).padStart(3)} pp=${String(pn.pinPinOverlaps).padStart(3)} dia=${pn.coreDiaMin}-${pn.coreDiaMax}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
await writeFile(resolve(OUT, 'audit.json'), JSON.stringify(report, null, 1));
console.log('→', resolve(OUT, 'audit.json'));
