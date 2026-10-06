// Local-only demo: injects ILLUSTRATIVE open-to values for one entry into the
// served /sdl-data.js (never written to the repo) to show the block + filter.
//   node scripts/qa/cc-demo-shot.mjs --base http://127.0.0.1:4321 --id atinary --lang en
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, arr) => a.startsWith('--') ? [[a.slice(2), arr[i + 1]]] : []));
const BASE = args.base || 'http://127.0.0.1:4321', ID = args.id || 'atinary', LANG = args.lang || 'en';
const OUT = 'scripts/qa/out/cc'; mkdirSync(OUT, { recursive: true });
const DEMO = { offers: ['collaboration', 'software', 'training'], seeks: ['use-cases', 'academic-partners'],
  stack: { hardware: ['Chemspeed', 'Bruker NMR'], software: ['SiLA 2'] } };
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('sdlmap.welcomeSeen', '1'); sessionStorage.setItem('sdl-arrived', '1'); localStorage.setItem('sdlmap.storySeen', '1'); for (const k of ['zh','ja','ko','en']) localStorage.setItem('sdlmap.welcomeSeen.' + k, '1'); localStorage.setItem('sdlmap.welcomeSeen.zh-Hans', '1'); } catch (e) {} });
await ctx.route('**/sdl-data.js', async route => {
  const r = await route.fetch(); const body = await r.text();
  await route.fulfill({ response: r, body: body + `\n;(function(){var d=(window.SDL_DATA||[]).find(function(x){return x.id==='${ID}'}); if(d) d.open=${JSON.stringify(DEMO)};})();` });
});
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(`${BASE}/map-legacy.html?embed=0&lang=${LANG}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
// filter: Open to → Software / platform
const chip = p.locator('.chips[data-group="open"] .chip[data-key="software"]');
const vis = await p.evaluate(() => { const g = document.querySelector('.chips[data-group="open"]'); return { hiddenAttr: g ? g.hidden : 'missing', demo: !!(window.SDL_DATA.find(x => x.id === 'atinary') || {}).open }; });
// open the filters drawer so the group is on screen, then use the real chip
await p.evaluate(() => { const a = document.querySelector('aside.right'); a && a.classList.add('open'); document.querySelector('aside.left')?.classList.add('open'); document.body.classList.add('left-open'); });
await p.evaluate(() => document.querySelector('.chips[data-group="open"] .chip[data-key="software"]')?.click());
await p.waitForTimeout(800);
const shown = await p.evaluate(() => window.__sdlGetFiltered().map(d => d.id));
await p.screenshot({ path: `${OUT}/cc-demo-filter-${LANG}.png` });
await p.evaluate(id => window.__sheet.openSheet(window.SDL_DATA.find(x => x.id === id)), ID);
await p.waitForTimeout(700);
await p.evaluate(() => document.querySelector('#sdl-sheet .sheet-open')?.scrollIntoView({ block: 'center' }));
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/cc-demo-card-${LANG}.png` });
console.log(JSON.stringify({ lang: LANG, openGroupVisible: vis, filtered: shown, errors: errs }));
await b.close();
