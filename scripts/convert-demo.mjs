import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'demo_v1/index.html'), 'utf8');

const start = html.indexOf('const PRODUCTS=');
if (start === -1) {
  throw new Error('PRODUCTS block not found');
}
const endMarker = '/* ================= tiny event log';
const end = html.indexOf(endMarker);
if (end === -1 || end < start) {
  throw new Error('FITMENT block end not found');
}
const src = html.slice(start, end);

const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${src}\nglobalThis.__PRODUCTS = PRODUCTS;\nglobalThis.__FITMENT = FITMENT;\n`, ctx);
const demoProducts = ctx.__PRODUCTS;
const demoFitment = ctx.__FITMENT;

function segmentOf(cat) {
  if (cat === 'truck') return 'truck';
  if (cat === 'moto') return 'moto';
  if (cat === 'deep') return 'deep';
  return 'car';
}

const batteries = demoProducts.map((p) => {
  const [l, w, h] = String(p.dims).split(/[×x]/).map((n) => Number(n.trim()));
  return {
    id: p.id,
    brand: 'AMPER',
    name: p.name,
    segment: segmentOf(p.cat),
    tech: p.tech === 'SMF HD' ? 'SMF' : p.tech,
    voltage: p.v,
    ah: p.ah,
    cca: p.cca,
    polarity: p.term,
    caseCode: p.size,
    dimsMm: { l, w, h },
    warrantyMonths: p.warr,
    price: p.price,
    stock: p.stock,
    oemCodes: p.oem,
    active: true
  };
});

function slugify(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const byId = new Map(batteries.map((b) => [b.id, b]));
const fitments = [];
const seenIds = new Set();
for (const [type, makes] of Object.entries(demoFitment)) {
  for (const [make, models] of Object.entries(makes)) {
    for (const [model, rows] of Object.entries(models)) {
      rows.forEach((row, k) => {
        const base = slugify(`${type}-${make}-${model}-${k + 1}`);
        let id = base;
        let n = 2;
        while (seenIds.has(id)) {
          id = `${base}-${n}`;
          n += 1;
        }
        seenIds.add(id);
        const ref = byId.get(row.p[0]);
        let techMin = ['SMF', 'EFB', 'AGM'].includes(ref.tech) ? ref.tech : 'SMF';
        const startStop = row.e.toLowerCase().includes('start-stop');
        if (startStop && techMin === 'SMF') {
          techMin = 'EFB';
        }
        fitments.push({
          id,
          type,
          make,
          model,
          engine: row.e,
          yearFrom: row.f,
          yearTo: row.t,
          startStop,
          oem: {
            ahMin: ref.ah,
            ccaMin: ref.cca,
            polarity: ref.polarity,
            caseCode: ref.caseCode,
            techMin
          },
          include: [...row.p],
          source: 'demo',
          verified: false
        });
      });
    }
  }
}

mkdirSync(path.join(root, 'data'), { recursive: true });
writeFileSync(path.join(root, 'data/batteries.json'), `${JSON.stringify(batteries, null, 2)}\n`);
writeFileSync(path.join(root, 'data/fitments.json'), `${JSON.stringify(fitments, null, 2)}\n`);

const makesByType = {};
for (const f of fitments) {
  makesByType[f.type] = makesByType[f.type] || new Set();
  makesByType[f.type].add(f.make);
}
console.log(`batteries: ${batteries.length}`);
console.log(`fitments: ${fitments.length}`);
for (const [type, makes] of Object.entries(makesByType)) {
  const count = fitments.filter((f) => f.type === type).length;
  console.log(`fitments ${type}: ${count} (${makes.size} makes)`);
}
