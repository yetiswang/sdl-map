// Static sitemap — rebuilt on every deploy. Hand-built XML, no dependencies.
// Views + about ×4 locales, every entry page ×4 locales. Each URL lists its
// four language alternates (en = x-default) so search engines pair them, and
// lastmod comes from git history of the content that feeds the page, not the
// build clock (a build-date lastmod on 500 URLs is noise crawlers learn to
// ignore). See DESIGN.md § SEO.
import data from '../data/sdl_data.json';
import watch from '../data/sdl_watch.json';
import { gitDate, maxDate, today } from '../utils/dates';

const SITE = 'https://sdl-map.discoverylabs.nl';
const LOCALES: [string, string][] = [['en', ''], ['zh-Hans', '/zh'], ['ja', '/ja'], ['ko', '/ko']]; // zh-Hant is a client-side script variant of /zh

export async function GET() {
  const dataDate = gitDate('src/data/sdl_data.json');
  const evoDate = gitDate('src/data/sdl_evolution.json');
  const watchDate = maxDate(gitDate('src/data/sdl_watch.json'), ...watch.map(w => w.date));
  const aboutDate = maxDate(gitDate('src/pages/about.astro'), gitDate('src/i18n/about.json'));
  const layoutDate = gitDate('src/layouts/UnifiedLayout.astro');

  // [base path, lastmod, priority]
  const views: [string, string, string][] = [
    ['/',          maxDate(dataDate, watchDate, layoutDate), '1.0'],
    ['/list/',     maxDate(dataDate, gitDate('src/pages/list.astro')), '0.8'],
    ['/timeline/', maxDate(dataDate, evoDate, gitDate('src/pages/timeline.astro')), '0.8'],
    ['/watch/',    watchDate, '0.8'],
    ['/about/',    aboutDate, '0.5'],
  ];
  for (const e of data as { id: string }[]) views.push([`/entry/${e.id}/`, dataDate, '0.6']);

  const alternates = (base: string) =>
    LOCALES.map(([hl, pfx]) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${SITE}${pfx}${base}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${base}"/>`)
      .join('\n');

  const urls: string[] = [];
  for (const [base, lastmod, priority] of views) {
    for (const [, pfx] of LOCALES) {
      urls.push(`  <url>\n    <loc>${SITE}${pfx}${base}</loc>\n    <lastmod>${lastmod || today()}</lastmod>\n    <priority>${priority}</priority>\n${alternates(base)}\n  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
