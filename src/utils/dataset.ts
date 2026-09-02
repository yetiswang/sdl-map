// Tabular serialisations of the SDL dataset, shared by the /sdl-data.csv,
// /sdl-data.txt and /sdl-data.xlsx build-time endpoints. One column contract
// so the three downloads can never disagree with each other or with the map.
import data from '../data/sdl_data.json';

export type Entry = (typeof data)[number];

export const COLUMNS = [
  'id', 'name', 'org', 'city', 'country', 'lat', 'lon',
  'tier', 'domain', 'maturity', 'charact', 'ai', 'scale',
  'invest_musd', 'invest_label', 'start', 'url', 'sources',
] as const;

const NUMERIC = new Set(['lat', 'lon', 'invest_musd', 'start']);
export const isNumericColumn = (c: string) => NUMERIC.has(c);

const blank = (v: unknown) => v === '---' || v === '' || v == null;

// One row per entry, in COLUMNS order. Placeholder "---" values become empty
// cells; invest 0 means "not reported", not zero dollars.
export function toRow(e: Entry): (string | number)[] {
  return [
    e.id, e.name, e.org, e.city, e.country, e.lat, e.lon,
    e.tier, e.domain, e.maturity,
    blank(e.charact) ? '' : e.charact,
    e.ai, e.scale,
    e.invest > 0 ? e.invest : '',
    blank(e.investLabel) ? '' : e.investLabel,
    e.start > 0 ? e.start : '',
    e.url,
    (e.sources || []).join(' ; '),
  ];
}

export function datasetMeta() {
  return {
    title: 'SDL Landscape — self-driving lab initiatives worldwide',
    site: 'https://sdl-map.discoverylabs.nl',
    license: 'MIT — cite the map when reusing (github.com/yetiswang/sdl-map)',
    count: data.length,
    countries: new Set(data.map(d => d.country)).size,
    date: new Date().toISOString().slice(0, 10),
  };
}

export function toCSV(): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [COLUMNS.join(',')];
  for (const e of data) lines.push(toRow(e).map(esc).join(','));
  // BOM so Excel opens UTF-8 (flags/CJK in labels) correctly.
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

export function toTXT(): string {
  const m = datasetMeta();
  const tiers: [string, string][] = [
    ['national', 'National / flagship programmes'],
    ['academic', 'Academic platforms'],
    ['commercial', 'Commercial platforms'],
    ['labos', 'Lab OS / orchestration'],
  ];
  const out: string[] = [
    m.title.toUpperCase(),
    `${m.count} initiatives · ${m.countries} countries · dataset of ${m.date}`,
    m.site,
    m.license,
    '',
  ];
  for (const [tier, label] of tiers) {
    const items = data.filter(d => d.tier === tier);
    out.push(`${'='.repeat(72)}`, `${label.toUpperCase()} (${items.length})`, `${'='.repeat(72)}`, '');
    for (const e of items) {
      out.push(`${e.name} — ${e.org}`);
      out.push(`  ${e.city}, ${e.country}`);
      const facts = [
        `domain: ${e.domain}`, `maturity: ${e.maturity}`, `ai: ${e.ai}`,
        e.start > 0 ? `since: ${e.start}` : '',
        !blank(e.investLabel) ? `investment: ${e.investLabel}` : '',
      ].filter(Boolean);
      out.push(`  ${facts.join(' · ')}`);
      out.push(`  ${e.url}`);
      out.push('');
    }
  }
  return out.join('\n');
}
