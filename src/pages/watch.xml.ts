// Static RSS 2.0 feed for the SDL Watch — rebuilt on every deploy from sdl_watch.json.
// Hand-built XML: no dependencies (DESIGN.md: no third-party runtime origins).
import watch from '../data/sdl_watch.json';

const SITE = 'https://sdl-map.discoverylabs.nl';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const items = [...watch].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const entries = items
    .map(it => {
      const link = `${SITE}/watch/#${it.id}`;
      const sources = (it.sources || [])
        .map(s => `${esc(s.label)}: ${esc(s.url)}`)
        .join(' · ');
      const desc = esc(it.summary) + (sources ? `\n\nSources — ${sources}` : '');
      return `    <item>
      <title>${esc(it.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(it.date + 'T12:00:00Z').toUTCString()}</pubDate>
      <category>${esc(it.kind)}</category>
      <description>${desc}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>SDL Watch — Global Self-Driving Lab Landscape</title>
    <link>${SITE}/watch/</link>
    <description>Noteworthy signals from the self-driving-lab and AI-for-materials landscape: talent moves, new labs, funding, and policy. Curated by DiscoveryLabNL.</description>
    <language>en</language>
    <lastBuildDate>${new Date(items[0]?.date + 'T12:00:00Z').toUTCString()}</lastBuildDate>
${entries}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
