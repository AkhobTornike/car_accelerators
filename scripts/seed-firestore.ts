// Loads data/batteries.json and data/fitments.json into Firestore and builds the vehicle index
// (vehicleIndex/{type}) in one go. Replaces the content of those three collections; sales, movements and
// the change log are never touched.
//
//   emulator:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 node --experimental-strip-types scripts/seed-firestore.ts
//   real:      GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node --experimental-strip-types scripts/seed-firestore.ts --confirm
import { readFileSync } from 'node:fs';
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

for (const c of ['batteries', 'fitments', 'vehicleIndex']) await clear(c);
await fill('batteries', batteries);
await fill('fitments', fitments);

const byType = new Map<string, Record<string, unknown>[]>();
for (const f of fitments) {
  const entry = { id: f.id, make: f.make, model: f.model, engine: f.engine, yearFrom: f.yearFrom, yearTo: f.yearTo };
  byType.set(String(f.type), [...(byType.get(String(f.type)) ?? []), entry]);
}
for (const [type, entries] of byType) await db.collection('vehicleIndex').doc(type).set({ entries });

console.log(`seeded ${batteries.length} batteries, ${fitments.length} fitments, index for: ${[...byType.keys()].join(', ')}`);
