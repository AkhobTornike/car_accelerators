// Builds ESTIMATED fitments for the vehicle finder from two public sources and merges them into data/fitments.json:
//   1. the US EPA fuel-economy list (https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip): make, model, year,
//      engine size, fuel, hybrid, start-stop;
//   2. data-src/extra-models.csv: models common in Georgia that the US list lacks (Opel, Renault, Peugeot, ...).
// Neither source knows the battery. The OEM spec (Ah, CCA, technology) is a rule of thumb from engine size, fuel and
// vehicle class. Polarity and case are left out, rows are marked source "estimated", and every match shown to a
// customer says the fit must be confirmed. Rows the shop entered itself (source shop/manufacturer/demo) are kept
// and win: nothing is generated for a make/model they already cover.
//
//   node scripts/build-vehicles.mjs /path/to/vehicles.csv [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const epaFile = process.argv[2];
const dry = process.argv.includes('--dry');
if (!epaFile) {
  console.error('usage: node scripts/build-vehicles.mjs /path/to/vehicles.csv [--dry]');
  process.exit(2);
}

const MIN_YEAR = 1995;
const norm = (s) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const slug = (s) => s.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// ---- rules of thumb: [engine-size ceiling in litres, Ah, CCA] ----
const PETROL = [[1.2, 40, 330], [1.6, 50, 420], [2.0, 60, 480], [2.5, 60, 520], [3.5, 70, 600], [4.5, 80, 700], [99, 90, 760]];
const DIESEL = [[1.6, 60, 540], [2.0, 70, 640], [3.0, 80, 720], [99, 95, 800]];
const CLASS_LITRES = { A: 1.0, B: 1.4, C: 1.8, D: 2.4, SUV: 2.2, VAN: 2.0, PICKUP: 2.5 };
const HYBRID = [45, 330];

function bandOf(table, litres) {
  return table.find(([max]) => litres <= max);
}
function spec({ litres, diesel, hybrid, big }) {
  if (hybrid) return { ah: HYBRID[0], cca: HYBRID[1] };
  const table = diesel ? DIESEL : PETROL;
  let i = table.indexOf(bandOf(table, litres));
  if (big && i < table.length - 1) i += 1; // SUVs, vans and pickups carry more electrics and cold-start load
  return { ah: table[i][1], cca: table[i][2] };
}
const engineLabel = ({ litres, cyl, diesel, hybrid, turbo, startStop }) =>
  [litres ? `${litres.toFixed(1)}L` : null, cyl ? `${cyl}-cyl` : null, hybrid ? 'hybrid' : diesel ? 'diesel' : 'petrol', turbo ? 'turbo' : null, startStop ? 'start-stop' : null]
    .filter(Boolean).join(' ');

function mergeRanges(years) {
  const ys = [...new Set(years)].sort((a, b) => a - b);
  const out = [];
  for (const y of ys) {
    const last = out[out.length - 1];
    if (last && y === last[1] + 1) last[1] = y; else out.push([y, y]);
  }
  return out;
}

// ---- existing data ----
const fitmentsPath = path.join(root, 'data/fitments.json');
const previous = JSON.parse(readFileSync(fitmentsPath, 'utf8')).filter((f) => f.source !== 'estimated');
// Rows the shop confirmed always win. Demo rows are a thin fictional sample: they are replaced wherever a generated row covers the same model.
const existingReal = previous.filter((f) => f.source !== 'demo');
const demoRows = previous.filter((f) => f.source === 'demo');
const coveredAny = new Set(existingReal.map((f) => `${norm(f.make)}|${norm(f.model)}`));

// ---- EPA ----
const epa = parseCsv(readFileSync(epaFile, 'utf8')).filter((r) => Number(r.year) >= MIN_YEAR && r.atvType !== 'EV' && r.fuelType1 !== 'Hydrogen' && r.fuelType1 !== 'Natural Gas');
const groups = new Map();
for (const r of epa) {
  const model = r.baseModel.replace(/\s+(2WD|4WD|AWD|FWD|RWD)$/i, '').trim();
  const v = r.VClass || '';
  const type = /Van/i.test(v) && !/Minivan/i.test(v) ? 'van' : 'car';
  const litres = Number(r.displ) || 0;
  const diesel = r.fuelType1 === 'Diesel';
  const hybrid = r.atvType === 'Hybrid' || r.atvType === 'Plug-in Hybrid';
  const turbo = !!(r.tCharger || r.sCharger);
  const startStop = r.startStop === 'Y' && !hybrid; // a hybrid's small 12 V battery does not need EFB/AGM
  const big = /Sport Utility|Pickup|Van|Special Purpose|Minivan/i.test(v);
  if (!litres && !hybrid) continue;
  const cyl = Number(r.cylinders) || 0;
  // one row per visible engine label, so two rows of the same car never overlap in years
  const key = [type, r.make, model, engineLabel({ litres, cyl, diesel, hybrid, turbo, startStop })].join('|');
  if (!groups.has(key)) groups.set(key, { type, make: r.make, model, litres, cyl, diesel, hybrid, turbo, startStop, big, years: [] });
  const g = groups.get(key);
  g.big = g.big || big;
  g.years.push(Number(r.year));
}

const generated = [];
const epaModels = new Set();
for (const g of groups.values()) {
  if (coveredAny.has(`${norm(g.make)}|${norm(g.model)}`)) continue;
  epaModels.add(`${norm(g.make)}|${norm(g.model)}`);
  const s = spec(g);
  for (const [yearFrom, yearTo] of mergeRanges(g.years)) {
    generated.push({ type: g.type, make: g.make, model: g.model, engine: engineLabel(g), yearFrom, yearTo, startStop: g.startStop, ...s });
  }
}

// ---- curated extras (only for models the EPA list does not know) ----
const extra = parseCsv(readFileSync(path.join(root, 'data-src/extra-models.csv'), 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n'));
let extraRows = 0;
for (const e of extra) {
  const k = `${norm(e.make)}|${norm(e.model)}`;
  if (epaModels.has(k) || coveredAny.has(k)) continue;
  const yearFrom = Math.max(Number(e.yearFrom), MIN_YEAR);
  const yearTo = Number(e.yearTo);
  if (!yearTo || yearTo < yearFrom) continue;
  const big = ['SUV', 'VAN', 'PICKUP'].includes(e.class);
  const type = e.class === 'VAN' ? 'van' : 'car';
  const variants = [{ diesel: false, label: `${CLASS_LITRES[e.class].toFixed(1)}L petrol (typical)` }];
  if (e.diesel === 'yes') variants.push({ diesel: true, label: `${Math.max(CLASS_LITRES[e.class], 1.5).toFixed(1)}L diesel (typical)` });
  for (const v of variants) {
    const litres = v.diesel ? Math.max(CLASS_LITRES[e.class], 1.5) : CLASS_LITRES[e.class];
    const s = spec({ litres, diesel: v.diesel, hybrid: false, big });
    generated.push({ type, make: e.make, model: e.model, engine: v.label, yearFrom, yearTo, startStop: false, ...s });
    extraRows += 1;
  }
}

// ---- to Fitment rows ----
const generatedModels = new Set(generated.map((g) => `${norm(g.make)}|${norm(g.model)}`));
const existing = [...existingReal, ...demoRows.filter((f) => !generatedModels.has(`${norm(f.make)}|${norm(f.model)}`))];
const usedIds = new Set(existing.map((f) => f.id));
const rows = generated.map((g) => {
  const base = slug(`${g.type}-${g.make}-${g.model}-${g.engine}-${g.yearFrom}`).slice(0, 78);
  let id = base;
  for (let n = 2; usedIds.has(id); n += 1) id = `${base.slice(0, 74)}-${n}`;
  usedIds.add(id);
  return {
    id, type: g.type, make: g.make, model: g.model, engine: g.engine, yearFrom: g.yearFrom, yearTo: g.yearTo, startStop: g.startStop,
    oem: { ahMin: g.ah, ccaMin: g.cca, techMin: g.startStop ? 'EFB' : 'SMF' },
    source: 'estimated', verified: false,
  };
});

const all = [...existing, ...rows];
const makes = new Set(rows.map((r) => `${r.type}|${r.make}`));
const models = new Set(rows.map((r) => `${r.type}|${r.make}|${r.model}`));
console.log(`kept ${existing.length} shop/demo rows (dropped ${previous.length - existing.length} demo rows now covered); generated ${rows.length} estimated rows (EPA ${rows.length - extraRows}, curated ${extraRows}); ${makes.size} makes, ${models.size} models`);
console.log(`per type: ${['car', 'van', 'truck', 'moto'].map((t) => `${t} ${all.filter((f) => f.type === t).length}`).join(', ')}`);
if (!dry) {
  writeFileSync(fitmentsPath, `${JSON.stringify(all, null, 1)}\n`);
  console.log(`wrote ${fitmentsPath}`);
}
