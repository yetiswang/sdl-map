// Static sitemap — rebuilt on every deploy. Hand-built XML, no dependencies.
// Views ×4 locales + every entry page ×4 locales + the Watch RSS feed.
import data from '../data/sdl_data.json';
import watch from '../data/sdl_watch.json';

const SITE = 'https://sdl-map.discoverylabs.nl';
const LOCALES = ['', '/zh', '/ja', '/ko']; // en at root; zh-Hant is a client-side script variant of /zh
const VIEWS = ['/', '/list/', '/timeline/', '/watch/'];

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const latestWatch = [...watch].map(w => w.date).sort().pop() || today;

  const urls: { loc: string; lastmod: string; priority: string }[] = [];
  for (const loc of LOCALES) {
    for (const v of VIEWS) {
      urls.push({
        loc: `${SITE}${loc}${v === '/' && loc ? '/' : v}`,
        lastmod: v === '/watch/' ? latestWatch : today,
        priority: v === '/' ? '1.0' : '0.8',
      });
    }
  }
  for (const e of data as { id: string }[]) {
    for (const loc of LOCALES) {
      urls.push({ loc: `${SITE}${loc}/entry/${e.id}/`, lastmod: today, priority: '0.6' });
    }
  }

  const body = urls
    .map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
