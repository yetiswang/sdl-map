// First-visit tour walk-through (2026-10-06): plays the tour as a first-time
// visitor (welcome card → close → tour), does each step's action, and saves a
// screenshot per step to scripts/qa/out/<label>/coach-<view>-<n>.png.
//   node scripts/qa/coach-shots.mjs --base http://127.0.0.1:4321 --label coach [--tz Europe/Amsterdam] [--lang en]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, arr) =>
  a.startsWith('--') ? [[a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : []));
const BASE = (args.base || 'http://127.0.0.1:4321').replace(/\/$/, '');
const OUT = resolve('scripts/qa/out', args.label || 'coach'); mkdirSync(OUT, { recursive: true });
const TZ = args.tz || 'Europe/Amsterdam', LANG = args.lang || 'en';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
for (const [view, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, timezoneId: TZ });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`${BASE}/map-legacy.html?embed=0&lang=${LANG}`, { waitUntil: 'networkidle' });
  await p.waitForSelector('#wmBackdrop.is-open', { timeout: 8000 });
  await p.click('#wmClose');
  const tipText = async () => p.evaluate(() => { const c = document.getElementById('sdl-coach'); return c && !c.hidden ? c.querySelector('.coach-step').textContent + ' | ' + c.querySelector('.coach-text').textContent : null; });
  await p.waitForFunction(() => { const c = document.getElementById('sdl-coach'); return c && !c.hidden; }, null, { timeout: 15000 });
  await p.waitForTimeout(600);
  const s1 = await tipText(); await p.screenshot({ path: `${OUT}/coach-${view}-1.png` });
  // step 1 action: tap the showcase pin the tip points at
  const id = await p.evaluate(() => { const m = [...document.querySelectorAll('.marker[data-id]')].find(m => { const r = m.getBoundingClientRect(); return r.width > 0; }); const c = document.getElementById('sdl-coach').querySelector('.coach-text').textContent; const d = window.SDL_DATA.find(x => c.includes(x.name)); return d && d.id; });
  const box = await p.locator(`.marker[data-id="${id}"]`).first().boundingBox();
  if (box) { if (mobile) await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); else await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); }
  await p.waitForTimeout(1300);
  const s1b = await tipText(); await p.screenshot({ path: `${OUT}/coach-${view}-1b.png` });
  await p.click('#sdl-coach .coach-btn:not(.ghost)');
  await p.waitForTimeout(800);
  const s2 = await tipText(); await p.screenshot({ path: `${OUT}/coach-${view}-2.png` });
  // step 2 action: open the filters, tap a chip
  if (mobile) { await p.click('#msheet-tab-filters'); await p.waitForTimeout(700); await p.evaluate(() => document.querySelector('#msheet-filters .chips[data-group="domain"] .chip').click()); }
  else { await p.evaluate(() => document.getElementById('mob-filters').click()); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('aside.left .chips[data-group="tier"] .chip').click()); }
  await p.waitForTimeout(1200);
  const s2b = await tipText(); await p.screenshot({ path: `${OUT}/coach-${view}-2b.png` });
  await p.click('#sdl-coach .coach-btn:not(.ghost)');   // Clear and continue
  await p.waitForTimeout(900);
  const s4 = await tipText(); await p.screenshot({ path: `${OUT}/coach-${view}-4.png` });
  await p.click('#sdl-coach .coach-btn:not(.ghost)');   // Open it
  await p.waitForTimeout(700);
  const dataOpen = await p.evaluate(() => document.getElementById('exp-data-backdrop')?.classList.contains('open'));
  await p.screenshot({ path: `${OUT}/coach-${view}-4b.png` });
  await p.evaluate(() => document.querySelector('#exp-data-backdrop .exp-close').click());
  await p.waitForTimeout(900);
  const s5 = await tipText(); await p.screenshot({ path: `${OUT}/coach-${view}-5.png` });
  const filtersAfter = await p.evaluate(() => Object.values(window.__sdlGetFilters()).flat().length);
  await p.click('#sdl-coach .coach-btn.ghost');   // skip/finish
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ hidden: document.getElementById('sdl-coach').hidden, done: localStorage.getItem('sdlmap.tourDone'), coachOn: document.body.classList.contains('coach-on'), playVisible: getComputedStyle(document.getElementById('sdl-story-play')).visibility }));
  report.push({ view, id, s1, s1b, s2, s2b, s4, dataOpen, s5, filtersAfter, after, errors });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
