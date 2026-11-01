#!/usr/bin/env node
// Screenshot build/feature-card@2x.html at 2400x1254 into public/sdl-landscape-card.png.
// Run after make_card.py. Uses the installed Chrome through playwright-core, like scripts/qa.
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = pathToFileURL(path.join(here, 'build', 'feature-card@2x.html')).href;
const out = path.resolve(here, '..', '..', 'public', 'sdl-landscape-card.png');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 2400, height: 1254 } });
await page.goto(src);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
