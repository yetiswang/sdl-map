// Claim & Connect visual check (2026-10-06): opens detail cards, the
// introduction dialog and an entry page on desktop and phone, and saves
// screenshots to scripts/qa/out/<label>/cc-*.png.
//   node scripts/qa/cc-shots.mjs --base http://127.0.0.1:4321 --label cc
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, arr) =>
  a.startsWith('--') ? [[a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : []));
const BASE = (args.base || 'http://127.0.0.1:4321').replace(/\/$/, '');
const OUT = resolve('scripts/qa/out', args.label || 'cc');
mkdirSync(OUT, { recursive: true });
const LANG = args.lang || 'en';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function mapPage(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: 'dark' });
  await ctx.addInitScript(() => { try { localStorage.setItem('sdlmap.welcomeSeen', '1'); sessionStorage.setItem('sdl-arrived', '1'); localStorage.setItem('sdlmap.storySeen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/map-legacy.html?embed=0&lang=${LANG}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
}
async function openCard(page, id) {
  await page.evaluate(id => {
    const d = window.SDL_DATA.find(x => x.id === id);
    window.__sheet.openSheet(d);
  }, id);
  await page.waitForTimeout(700);
}

const report = [];
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const { ctx, page, errors } = await mapPage(vp, mobile);
  for (const id of ['empa_aurora', 'atinary']) {
    await openCard(page, id);
    const info = await page.evaluate(() => {
      const s = document.getElementById('sdl-sheet');
      const cc = s.querySelector('.sheet-cc');
      const r = s.getBoundingClientRect();
      return {
        intro: !!s.querySelector('.cc-intro'), claimed: s.querySelector('.cc-claimed')?.textContent || '',
        links: [...s.querySelectorAll('.cc-links a')].map(a => a.textContent),
        ccVisibleInCard: cc ? cc.getBoundingClientRect().top < r.bottom + s.scrollHeight : false,
      };
    });
    report.push({ view: name, id, ...info });
    // scroll the card to the new block so it is in the shot
    await page.evaluate(() => { const s = document.getElementById('sdl-sheet'); const cc = s.querySelector('.sheet-cc'); if (cc) cc.scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/cc-${name}-${id}.png` });
  }
  // introduction dialog from the claimed card
  await openCard(page, 'empa_aurora');
  await page.click('.cc-intro');
  await page.waitForTimeout(400);
  await page.fill('#cc-form input[name=name]', 'A. Example');
  await page.fill('#cc-form input[name=org]', 'Battery start-up, Germany');
  await page.fill('#cc-form input[name=email]', 'a.example@example.org');
  await page.selectOption('#cc-form select[name=purpose]', 'access');
  await page.fill('#cc-form textarea[name=context]', 'Electrolyte screening; we would like autonomous cycling access for three months.');
  await page.screenshot({ path: `${OUT}/cc-${name}-dialog.png` });
  report.push({ view: name, dialogOpen: await page.evaluate(() => document.getElementById('cc-backdrop').classList.contains('open')), errors });
  await ctx.close();
}
// static entry page
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/entry/empa_aurora/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/cc-entry-empa_aurora.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
