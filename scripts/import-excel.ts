// Reads the client's filled Excel template and writes catalogue files for review. It does NOT touch data/ or Firestore.
//
//   npm run import:excel -- path/to/AMPER_ბაზის_შაბლონი.xlsx
//
// Output in import-out/: batteries.json, fitments.json, opening-stock.json, photos.json, report.txt.
// After checking the report: copy the three data files into data/, run `npm run validate:data`, then seed.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { convertRows, formatReport, type Cell } from './import-excel-lib.ts';
import { validateData } from './validate-data.ts';

const file = process.argv[2];
if (!file) {
  console.error('გამოყენება: npm run import:excel -- <xlsx ფაილი>');
  process.exit(2);
}

function plain(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && 'result' in v) return plain(v.result as ExcelJS.CellValue);
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('');
  if (typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v);
}

function rowsOf(ws: ExcelJS.Worksheet | undefined, width: number): Cell[][] {
  const out: Cell[][] = [];
  if (!ws) return out;
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    if (n === 1) return;
    out.push(Array.from({ length: width }, (_, i) => plain(row.getCell(i + 1).value)));
  });
  return out;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const sheetBat = wb.getWorksheet('აკუმულატორები');
const sheetFit = wb.getWorksheet('მანქანები');
if (!sheetBat || !sheetFit) {
  console.error('ფაილში ვერ ვიპოვე ფურცლები „აკუმულატორები“ და „მანქანები“. გამოიყენეთ ჩვენი შაბლონი.');
  process.exit(1);
}

const res = convertRows(rowsOf(sheetBat, 18), rowsOf(sheetFit, 14));
const dataIssues = validateData(res.batteries as never, res.fitments as never).filter((i) => i.level === 'error');
const report = `${formatReport(res)}${dataIssues.length ? `\n\nმონაცემთა შემოწმების შეცდომები (${dataIssues.length}):\n${dataIssues.map((i) => `- ${i.entity} ${i.id}: ${i.message}`).join('\n')}` : ''}\n`;

const outDir = path.resolve('import-out');
mkdirSync(outDir, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(path.join(outDir, name), typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
write('batteries.json', res.batteries);
write('fitments.json', res.fitments);
write('opening-stock.json', res.openingStock);
write('photos.json', res.photos);
write('report.txt', report);

console.log(report);
console.log(`ფაილები ჩაიწერა საქაღალდეში: ${outDir}`);
process.exit(res.issues.some((i) => i.level === 'error') || dataIssues.length ? 1 : 0);
