// Minimal hand-built .xlsx (build-time only; fflate is a devDependency and
// nothing here ships to the browser). Inline strings, one data sheet plus a
// small About sheet — no sharedStrings, no theme, just what Excel needs.
import { zipSync, strToU8 } from 'fflate';
import data from '../data/sdl_data.json';
import { COLUMNS, toRow, isNumericColumn, datasetMeta } from './dataset';

const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const colRef = (i: number) => {
  let n = i + 1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

function cell(ref: string, v: string | number, opts: { header?: boolean; numeric?: boolean } = {}): string {
  if (v === '' || v == null) return '';
  const style = opts.header ? ' s="1"' : '';
  if (!opts.header && opts.numeric && typeof v === 'number') {
    return `<c r="${ref}"${style}><v>${v}</v></c>`;
  }
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`;
}

function sheetXML(rows: (string | number)[][], opts: { headerRow?: boolean; widths?: number[]; numericCols?: Set<number> } = {}): string {
  const cols = (opts.widths || [])
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => cell(`${colRef(c)}${r + 1}`, v, {
          header: opts.headerRow && r === 0,
          numeric: opts.numericCols?.has(c),
        }))
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  const freeze = opts.headerRow
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData></worksheet>`;
}

export function buildXLSX(): Uint8Array {
  const m = datasetMeta();
  const numericCols = new Set(COLUMNS.map((c, i) => (isNumericColumn(c) ? i : -1)).filter(i => i >= 0));
  const dataRows: (string | number)[][] = [[...COLUMNS], ...data.map(e => toRow(e))];
  const widths = COLUMNS.map(c =>
    ({ id: 14, name: 34, org: 34, city: 16, country: 14, url: 40, sources: 60, invest_label: 22 } as Record<string, number>)[c] ?? 12);
  const aboutRows: (string | number)[][] = [
    [m.title],
    [`${m.count} initiatives across ${m.countries} countries`],
    [`Dataset as of ${m.date}`],
    [m.site],
    [m.license],
    [''],
    ['invest_musd is the approximate programme investment in millions USD; blank means not reported.'],
    ['Placeholder values ("---") in the source data are exported as blank cells.'],
  ];

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="SDL entries" sheetId="1" r:id="rId1"/><sheet name="About" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
    'xl/worksheets/sheet1.xml': strToU8(sheetXML(dataRows, { headerRow: true, widths, numericCols })),
    'xl/worksheets/sheet2.xml': strToU8(sheetXML(aboutRows, { widths: [110] })),
  };
  return zipSync(files, { level: 6 });
}
