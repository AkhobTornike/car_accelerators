// Turns the rows of the client's Excel template (AMPER_ბაზის_შაბლონი.xlsx) into catalogue data.
// Pure: takes plain cell values, returns batteries, fitments, opening stock and a list of human-readable problems.
// The CLI (import-excel.ts) reads the workbook and writes the result; nothing here touches disk or the database.
import type { Battery, Fitment, Polarity, Segment, Tech, VehicleType } from '../core/types.ts';

export type Cell = string | number | boolean | null | undefined;
export interface ImportIssue { level: 'error' | 'warning'; sheet: 'აკუმულატორები' | 'მანქანები'; row: number; message: string }
export interface ImportResult {
  batteries: Battery[];
  fitments: Fitment[];
  openingStock: { batteryId: string; qty: number }[];
  photos: { batteryId: string; file: string }[];
  issues: ImportIssue[];
}

const SEGMENTS: Record<string, Segment> = { 'მსუბუქი': 'car', 'სატვირთო': 'truck', 'მოტო': 'moto', 'ღრმა განმუხტვის': 'deep' };
const VEHICLES: Record<string, VehicleType> = { 'მსუბუქი': 'car', 'ფურგონი': 'van', 'სატვირთო': 'truck', 'მოტო': 'moto' };
const TECHS = ['SMF', 'EFB', 'AGM', 'DEEP-CYCLE'] as const;

const str = (c: Cell) => (c === null || c === undefined ? '' : String(c).trim());
const isBlank = (row: Cell[]) => row.every((c) => str(c) === '');
const num = (c: Cell): number | null => {
  const s = str(c).replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const slug = (s: string) => s.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
const isExample = (note: Cell) => str(note).startsWith('მაგალითი');

function polarityOf(c: Cell): Polarity | null {
  const s = str(c).toUpperCase().replace(/\s/g, '');
  return s === 'L+' || s === 'R+' ? s : null;
}

function techOf(c: Cell): Tech | null {
  const s = str(c).toUpperCase();
  return (TECHS as readonly string[]).includes(s) ? (s as Tech) : null;
}

export function convertRows(batteryRows: Cell[][], fitmentRows: Cell[][]): ImportResult {
  const issues: ImportIssue[] = [];
  const batteries: Battery[] = [];
  const openingStock: ImportResult['openingStock'] = [];
  const photos: ImportResult['photos'] = [];
  const usedIds = new Set<string>();
  const byName = new Map<string, Battery>();

  batteryRows.forEach((r, i) => {
    const row = i + 2;
    if (isBlank(r) || isExample(r[17])) return;
    const fail = (message: string) => issues.push({ level: 'error', sheet: 'აკუმულატორები', row, message });
    const warn = (message: string) => issues.push({ level: 'warning', sheet: 'აკუმულატორები', row, message });

    const name = str(r[0]);
    const brand = str(r[1]);
    const segment = SEGMENTS[str(r[2])];
    const tech = techOf(r[3]);
    const ah = num(r[4]);
    const cca = num(r[5]);
    const polarity = polarityOf(r[6]);
    const caseCode = str(r[7]).toUpperCase();
    const dims = { l: num(r[8]), w: num(r[9]), h: num(r[10]) };
    const warranty = num(r[11]);
    const price = num(r[12]);
    const cost = num(r[13]);
    const qty = num(r[14]);

    if (!name) return fail('მოდელის სახელი ცარიელია');
    if (!brand) fail('ბრენდი ცარიელია');
    if (!segment) fail(`ტიპი „${str(r[2])}“ არ არის სიიდან (მსუბუქი, სატვირთო, მოტო, ღრმა განმუხტვის)`);
    if (!tech) fail(`ტექნოლოგია „${str(r[3])}“ არ არის სიიდან (SMF, EFB, AGM, DEEP-CYCLE)`);
    if (ah === null || ah <= 0) fail('ტევადობა (Ah) უნდა იყოს დადებითი რიცხვი');
    if (cca === null || cca <= 0) fail('CCA უნდა იყოს დადებითი რიცხვი');
    if (!polarity) fail(`პოლარობა „${str(r[6])}“ უნდა იყოს L+ ან R+`);
    if (!caseCode) fail('კორპუსის კოდი ცარიელია');
    if (!dims.l || !dims.w || !dims.h) fail('სიგრძე, სიგანე და სიმაღლე (მმ) უნდა იყოს მითითებული');
    if (warranty === null || warranty < 0) fail('გარანტია (თვე) უნდა იყოს 0 ან მეტი');
    if (qty === null || qty < 0 || !Number.isInteger(qty)) fail('მარაგი უნდა იყოს მთელი რიცხვი, 0 ან მეტი');
    if (price !== null && price < 0) fail('გასაყიდი ფასი ვერ იქნება უარყოფითი');
    if (price === null) warn('ფასი არ არის მითითებული: საიტზე გამოჩნდება „ფასი მოთხოვნით“');
    if (byName.has(name.toLowerCase())) fail(`მოდელი „${name}“ ორჯერ არის ჩამოთვლილი`);

    if (issues.some((x) => x.row === row && x.sheet === 'აკუმულატორები' && x.level === 'error')) return;

    const base = slug(name) || `battery-${row}`;
    let id = base;
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`;
    usedIds.add(id);

    const battery: Battery = {
      id, brand, name, segment: segment!, tech: tech!, voltage: 12, ah: ah!, cca: cca!, polarity: polarity!, caseCode,
      dimsMm: { l: dims.l!, w: dims.w!, h: dims.h! }, warrantyMonths: warranty!,
      price: price === null ? null : round2(price),
      ...(cost === null ? {} : { costPrice: round2(cost) }),
      stock: qty! > 0 ? 'in' : 'out',
      oemCodes: [...new Set(str(r[15]).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))],
      active: true,
    };
    batteries.push(battery);
    byName.set(name.toLowerCase(), battery);
    if (qty! > 0) openingStock.push({ batteryId: id, qty: qty! });
    if (str(r[16])) photos.push({ batteryId: id, file: str(r[16]) });
  });

  const fitments: Fitment[] = [];
  const usedFitIds = new Set<string>();
  fitmentRows.forEach((r, i) => {
    const row = i + 2;
    if (isBlank(r.slice(0, 8)) || isExample(r[13])) return;
    const fail = (message: string) => issues.push({ level: 'error', sheet: 'მანქანები', row, message });

    const type = VEHICLES[str(r[0])];
    const make = str(r[1]);
    const model = str(r[2]);
    const engine = str(r[3]);
    const yearFrom = num(r[4]);
    const yearTo = num(r[5]);
    const ss = str(r[6]);
    const names = str(r[7]).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

    if (!type) fail(`ტრანსპორტი „${str(r[0])}“ არ არის სიიდან (მსუბუქი, ფურგონი, სატვირთო, მოტო)`);
    if (!make || !model || !engine) fail('მარკა, მოდელი და ძრავა/ვერსია აუცილებელია');
    if (yearFrom === null || yearTo === null || yearFrom < 1950 || yearTo < yearFrom || yearTo > 2100) fail('წლიდან/წლამდე არასწორია');
    if (ss !== 'დიახ' && ss !== 'არა') fail('Start-Stop უნდა იყოს „დიახ“ ან „არა“');
    if (!names.length) fail('ჩვენი შესაფერისი მოდელი(ები) ცარიელია');
    const include: string[] = [];
    for (const n of names) {
      const b = byName.get(n.toLowerCase());
      if (!b) fail(`მოდელი „${n}“ არ არის ფურცელზე „აკუმულატორები“`);
      else include.push(b.id);
    }
    if (issues.some((x) => x.row === row && x.sheet === 'მანქანები' && x.level === 'error')) return;

    const ref = batteries.find((b) => b.id === include[0])!;
    const startStop = ss === 'დიახ';
    let techMin: 'SMF' | 'EFB' | 'AGM' = ref.tech === 'DEEP-CYCLE' ? 'SMF' : ref.tech;
    if (startStop && techMin === 'SMF') techMin = 'EFB';
    const polarity = polarityOf(r[11]) ?? ref.polarity;
    const caseCode = str(r[12]).toUpperCase() || ref.caseCode;

    const base = slug(`${type}-${make}-${model}`) || `fitment-${row}`;
    let id = base;
    for (let n = 2; usedFitIds.has(id); n += 1) id = `${base}-${n}`;
    usedFitIds.add(id);

    fitments.push({
      id, type: type!, make, model, engine, yearFrom: yearFrom!, yearTo: yearTo!, startStop,
      oem: { ahMin: num(r[9]) ?? ref.ah, ccaMin: num(r[10]) ?? ref.cca, polarity, caseCode, techMin },
      include, source: 'shop', verified: true,
    });
  });

  return { batteries, fitments, openingStock, photos, issues };
}

export function formatReport(res: ImportResult): string {
  const errors = res.issues.filter((i) => i.level === 'error');
  const warnings = res.issues.filter((i) => i.level === 'warning');
  const line = (i: ImportIssue) => `- ${i.sheet}, სტრიქონი ${i.row}: ${i.message}`;
  return [
    `აკუმულატორი: ${res.batteries.length}, მანქანის ჩანაწერი: ${res.fitments.length}, საწყისი მარაგი: ${res.openingStock.reduce((s, x) => s + x.qty, 0)} ცალი, ფოტო: ${res.photos.length}`,
    errors.length ? `\nშეცდომები (${errors.length}) — ამ სტრიქონებს ვერ ვტვირთავთ:\n${errors.map(line).join('\n')}` : '\nშეცდომა არ არის.',
    warnings.length ? `\nგაფრთხილებები (${warnings.length}):\n${warnings.map(line).join('\n')}` : '',
  ].join('\n');
}
