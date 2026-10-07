// Loads data/batteries.json and data/fitments.json into Firestore and builds the vehicle index
// (vehicleIndex/{type}) in one go. Replaces the content of those three collections; sales, movements and
// the change log are never touched. data/opening-stock.json (optional) becomes initial stock-ledger movements.
// --fitments-only replaces just fitments and the vehicle index and leaves batteries (stock, prices, photos) alone.
//
//   emulator:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 node --experimental-strip-types scripts/seed-firestore.ts
//   real:      GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node --experimental-strip-types scripts/seed-firestore.ts --confirm
import { existsSync, readFileSync } from 'node:fs';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { validateData } from './validate-data.ts';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulator && !process.argv.includes('--confirm')) {
  console.error('This writes to the REAL Firestore project. Re-run with --confirm if that is what you want.');
  process.exit(2);
}

const read = (f: string) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8')) as Record<string, unknown>[];
const batteries = read('batteries');
const fitments = read('fitments');
// Optional data/opening-stock.json: [{ batteryId, qty }]. Written as 'initial' ledger movements so that quantity == sum(delta).
const openingStock: { batteryId: string; qty: number }[] = existsSync(new URL('../data/opening-stock.json', import.meta.url))
  ? (read('opening-stock') as unknown as { batteryId: string; qty: number }[])
  : [];

const errors = validateData(batteries, fitments).filter((i) => i.level === 'error');
if (errors.length) {
  for (const e of errors.slice(0, 15)) console.error(`[error] ${e.code} ${e.entity} ${e.id}: ${e.message}`);
  console.error(`${errors.length} data errors — nothing was written.`);
  process.exit(1);
}

const app = initializeApp(emulator ? { projectId: process.env.GCLOUD_PROJECT ?? 'demo-amper' } : { credential: applicationDefault() });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

async function clear(name: string) {
  const snap = await db.collection(name).select().get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function fill(name: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    rows.slice(i, i + 400).forEach((r) => batch.set(db.collection(name).doc(String(r.id)), r));
    await batch.commit();
  }
}

const fitmentsOnly = process.argv.includes('--fitments-only');
for (const c of fitmentsOnly ? ['fitments', 'vehicleIndex'] : ['batteries', 'fitments', 'vehicleIndex']) await clear(c);
const stockOf = new Map((fitmentsOnly ? [] : openingStock).map((o) => [o.batteryId, o.qty]));
const unknown = [...stockOf.keys()].filter((id) => !batteries.some((b) => b.id === id));
if (unknown.length) {
  console.error(`opening-stock.json names unknown batteries: ${unknown.join(', ')} — nothing was written.`);
  process.exit(1);
}
if (!fitmentsOnly) await fill('batteries', batteries.map((b) => (stockOf.has(String(b.id)) ? { ...b, quantity: stockOf.get(String(b.id)) } : b)));
const at = new Date().toISOString();
for (const [batteryId, qty] of stockOf) {
  const ref = db.collection('movements').doc(`initial-${batteryId}`);
  if (!(await ref.get()).exists) await ref.set({ id: ref.id, at, batteryId, delta: qty, kind: 'initial', note: 'opening stock (excel import)' });
}
await fill('fitments', fitments);

const byType = new Map<string, Record<string, unknown>[]>();
for (const f of fitments) {
  const entry = { id: f.id, make: f.make, model: f.model, engine: f.engine, yearFrom: f.yearFrom, yearTo: f.yearTo };
  byType.set(String(f.type), [...(byType.get(String(f.type)) ?? []), entry]);
}
for (const [type, entries] of byType) await db.collection('vehicleIndex').doc(type).set({ entries });

console.log(`seeded ${batteries.length} batteries (${stockOf.size} with opening stock), ${fitments.length} fitments, index for: ${[...byType.keys()].join(', ')}`);
