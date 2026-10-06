import { randomBytes } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { applyMovements, checkCustomer, checkSale, movementsForSale, movementsForVoid, normaliseStock, saleTotal } from '@core/inventory';
import { matchBatteries, yearInRange } from '@core/fitment-engine';
import type { ChangeEntry, DateRange, EngineOption, InventoryRepository, ReadRepository, WriteRepository } from '@core/repository';
import type { Battery, Fitment, NewMovement, Sale, SaleVoid, StockMovement, VehicleType } from '@core/types';
import { InventoryError } from './inventory-errors';
import { normaliseCode } from './json-repository';

/**
 * Firestore implementation of the same interfaces as the JSON repository.
 *
 * Reads are the scarce resource on the free plan (50k/day), so the vehicle tree lives in ONE small
 * index document per vehicle type (`vehicleIndex/{type}`, maintained inside the fitment write
 * transactions) and the catalogue is cached in memory. A finder request costs ~0 reads once warm.
 * Stock-changing operations are single transactions: sale/void/receive/adjust write the ledger AND
 * the battery quantity together, so concurrent sales cannot oversell.
 * Caches are per process and cleared by this process's own writes; another instance sees changes
 * after the TTL.
 */
export interface FirestoreOptions { cacheMs?: number }

const MAX_INDEX_ENTRIES = 6000; // an entry is ~120 bytes; one document may hold 1 MiB
const rid = (prefix: string) => `${prefix}-${randomBytes(5).toString('hex')}`;
const byText = (a: string, b: string) => a.localeCompare(b);
const distinct = (xs: string[]) => [...new Set(xs)].sort(byText);
const catalogueOrder = (a: Battery, b: Battery) => a.segment.localeCompare(b.segment) || a.tech.localeCompare(b.tech) || a.ah - b.ah || a.id.localeCompare(b.id);
const inRange = (iso: string, r?: DateRange) => (!r?.from || iso >= r.from) && (!r?.to || iso < r.to);
const cleanNote = (n?: string) => (n?.trim() ? n.trim().slice(0, 500) : undefined);
const chunks = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

interface IndexEntry { id: string; make: string; model: string; engine: string; yearFrom: number; yearTo: number }

class Ttl<T> {
  private hit: { at: number; value: T } | null = null;
  constructor(private ms: number) {}
  async get(load: () => Promise<T>): Promise<T> {
    if (this.hit && Date.now() - this.hit.at < this.ms) return this.hit.value;
    const value = await load();
    this.hit = { at: Date.now(), value };
    return value;
  }
  clear() { this.hit = null; }
}

export function createFirestoreRepositories(db: Firestore, options: FirestoreOptions = {}) {
  const ms = options.cacheMs ?? 10 * 60 * 1000;
  const col = {
    batteries: db.collection('batteries'),
    fitments: db.collection('fitments'),
    index: db.collection('vehicleIndex'),
    changes: db.collection('changes'),
    sales: db.collection('sales'),
    voids: db.collection('saleVoids'), // document id = the sale id, so a second void cannot be created
    movements: db.collection('movements'),
  };

  const batteryCache = new Ttl<Battery[]>(ms);
  const indexCache = new Map<VehicleType, Ttl<IndexEntry[]>>();
  const fitmentCache = new Map<string, { at: number; value: Fitment | null }>();
  const invalidate = () => {
    batteryCache.clear();
    indexCache.forEach((c) => c.clear());
    fitmentCache.clear();
  };

  const batteries = () => batteryCache.get(async () => (await col.batteries.get()).docs.map((d) => d.data() as Battery));
  const index = (type: VehicleType) => {
    let c = indexCache.get(type);
    if (!c) indexCache.set(type, (c = new Ttl<IndexEntry[]>(ms)));
    return c.get(async () => ((await col.index.doc(type).get()).data()?.entries as IndexEntry[] | undefined) ?? []);
  };
  async function fitment(id: string): Promise<Fitment | null> {
    const hit = fitmentCache.get(id);
    if (hit && Date.now() - hit.at < ms) return hit.value;
    const snap = await col.fitments.doc(id).get();
    const value = snap.exists ? (snap.data() as Fitment) : null;
    if (fitmentCache.size > 500) fitmentCache.clear();
    fitmentCache.set(id, { at: Date.now(), value });
    return value;
  }

  const entryOf = (f: Fitment): IndexEntry => ({ id: f.id, make: f.make, model: f.model, engine: f.engine, yearFrom: f.yearFrom, yearTo: f.yearTo });
  const log = (tx: Transaction, entity: ChangeEntry['entity'], action: ChangeEntry['action'], id: string, before: unknown, after: unknown, by: string) =>
    tx.set(col.changes.doc(), { at: new Date().toISOString(), by, action, entity, id, before: before ?? null, after: after ?? null });

  // Every fitment write touches the same vehicle-index document, so concurrent writes in ONE process would
  // fight each other (transaction retries, timeouts). Queue them here; other processes are covered by the
  // transaction itself. A bulk import must not go through this path row by row — it should write in batches
  // and rebuild the index once (see scripts/seed-firestore.ts).
  let fitmentQueue: Promise<unknown> = Promise.resolve();
  const queued = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = fitmentQueue.then(fn);
    fitmentQueue = run.catch(() => undefined);
    return run;
  };

  function writeFitment(f: Fitment | null, id: string, by: string) {
    return queued(() => writeFitmentNow(f, id, by));
  }

  async function writeFitmentNow(f: Fitment | null, id: string, by: string) {
    await db.runTransaction(async (tx) => {
      const ref = col.fitments.doc(id);
      const beforeSnap = await tx.get(ref);
      const before = beforeSnap.exists ? (beforeSnap.data() as Fitment) : null;
      if (!f && !before) return;
      const types = [...new Set([f?.type, before?.type].filter((t): t is VehicleType => !!t))];
      const idx = await Promise.all(types.map((t) => tx.get(col.index.doc(t))));
      if (f) tx.set(ref, f);
      else tx.delete(ref);
      types.forEach((t, i) => {
        const entries = ((idx[i].data()?.entries as IndexEntry[] | undefined) ?? []).filter((e) => e.id !== id);
        if (f && f.type === t) entries.push(entryOf(f));
        if (entries.length > MAX_INDEX_ENTRIES) throw new Error(`vehicle index for "${t}" is full (${MAX_INDEX_ENTRIES} entries)`);
        tx.set(col.index.doc(t), { entries });
      });
      log(tx, 'fitment', f ? (before ? 'update' : 'create') : 'delete', id, before, f, by);
    });
    invalidate();
  }

  async function writeBattery(b: Battery | null, id: string, by: string) {
    await db.runTransaction(async (tx) => {
      const ref = col.batteries.doc(id);
      const snap = await tx.get(ref);
      const before = snap.exists ? (snap.data() as Battery) : null;
      if (!b && !before) return;
      if (b) tx.set(ref, b);
      else tx.delete(ref);
      log(tx, 'battery', b ? (before ? 'update' : 'create') : 'delete', id, before, b, by);
    });
    invalidate();
  }

  const catalogue: ReadRepository & WriteRepository = {
    async getMakes(type) {
      return distinct((await index(type)).map((e) => e.make));
    },
    async getModels(type, make) {
      return distinct((await index(type)).filter((e) => e.make === make).map((e) => e.model));
    },
    async getEngines(type, make, model, year) {
      const rows = (await index(type)).filter((e) => e.make === make && e.model === model && (year === undefined || yearInRange(e, year)));
      const options: EngineOption[] = rows.map((e) => ({ fitmentId: e.id, label: e.engine, yearFrom: e.yearFrom, yearTo: e.yearTo }));
      return options.sort((a, b) => byText(a.label, b.label) || a.yearFrom - b.yearFrom);
    },
    getFitment: fitment,
    async findBatteriesForFitment(fitmentId) {
      const f = await fitment(fitmentId);
      if (!f) return [];
      return matchBatteries(f, (await batteries()).filter((b) => b.active));
    },
    async findByOldCode(code) {
      const wanted = normaliseCode(code);
      if (!wanted) return [];
      return (await batteries()).filter((b) => b.active && b.oemCodes.some((c) => normaliseCode(c) === wanted));
    },
    async getBattery(id) {
      const snap = await col.batteries.doc(id).get();
      return snap.exists ? (snap.data() as Battery) : null;
    },
    async listActiveBatteries() {
      return (await batteries()).filter((b) => b.active).sort(catalogueOrder);
    },
    upsertBattery: (b, by) => writeBattery(b, b.id, by),
    upsertFitment: (f, by) => writeFitment(f, f.id, by),
    deleteBattery: (id, by) => writeBattery(null, id, by),
    deleteFitment: (id, by) => writeFitment(null, id, by),
    async listBatteries() {
      return (await col.batteries.get()).docs.map((d) => d.data() as Battery);
    },
    async listFitments() {
      return (await col.fitments.get()).docs.map((d) => d.data() as Fitment);
    },
    async listChanges(limit) {
      return (await col.changes.orderBy('at', 'desc').limit(limit).get()).docs.map((d) => d.data() as ChangeEntry);
    },
  };

  /** Read the batteries a transaction touches (one round trip). Missing ids are simply absent from the result. */
  async function readBatteries(tx: Transaction, ids: string[]): Promise<Battery[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const snaps = await tx.getAll(...unique.map((id) => col.batteries.doc(id)));
    return snaps.filter((s) => s.exists).map((s) => s.data() as Battery);
  }

  /** Write movements and the updated batteries. Call after all reads of the transaction. */
  function writeMovements(tx: Transaction, current: Battery[], news: NewMovement[]): StockMovement[] {
    const stored: StockMovement[] = news.map((m) => ({ ...m, id: rid('m') }));
    for (const m of stored) tx.set(col.movements.doc(m.id), m);
    const touched = new Set(news.map((m) => m.batteryId));
    for (const b of current) if (touched.has(b.id)) tx.set(col.batteries.doc(b.id), applyMovements(b, news));
    return stored;
  }

  const inventory: InventoryRepository = {
    async recordSale(input) {
      const sale = await db.runTransaction(async (tx) => {
        const current = await readBatteries(tx, input.lines.map((l) => l.batteryId));
        const errors = [...(input.customer ? checkCustomer(input.customer) : []), ...checkSale(input, current)];
        if (errors.length) throw new InventoryError('invalid_sale', errors);

        const lines = input.lines.map((l) => {
          const b = current.find((x) => x.id === l.batteryId)!;
          return { batteryId: l.batteryId, name: b.name, qty: l.qty, unitPrice: l.unitPrice, unitCost: b.costPrice ?? null };
        });
        const soldAt = input.soldAt ?? new Date().toISOString();
        const s: Sale = {
          id: `s-${soldAt.slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex')}`,
          soldAt, ...(input.customer ? { customer: input.customer } : {}), lines, discount: input.discount,
          total: saleTotal(lines, input.discount), paymentMethod: input.paymentMethod,
          ...(cleanNote(input.note) ? { note: cleanNote(input.note) } : {}),
        };
        tx.set(col.sales.doc(s.id), s);
        writeMovements(tx, current, movementsForSale(s));
        return s;
      });
      invalidate();
      return sale;
    },

    async voidSale(saleId, reason) {
      const v = await db.runTransaction(async (tx) => {
        const saleSnap = await tx.get(col.sales.doc(saleId));
        if (!saleSnap.exists) throw new InventoryError('not_found');
        if (!reason.trim()) throw new InventoryError('invalid_input', ['a void needs a reason']);
        const voidRef = col.voids.doc(saleId);
        if ((await tx.get(voidRef)).exists) throw new InventoryError('already_voided');
        const sale = saleSnap.data() as Sale;
        const current = await readBatteries(tx, sale.lines.map((l) => l.batteryId));
        const record: SaleVoid = { id: rid('v'), saleId, at: new Date().toISOString(), reason: reason.trim().slice(0, 500) };
        tx.set(voidRef, record);
        writeMovements(tx, current, movementsForVoid(sale, record));
        return record;
      });
      invalidate();
      return v;
    },

    async receiveStock(batteryId, qty, opts) {
      if (!Number.isInteger(qty) || qty < 1) throw new InventoryError('invalid_input', ['qty must be a positive integer']);
      const m = await db.runTransaction(async (tx) => {
        const current = await readBatteries(tx, [batteryId]);
        if (!current.length) throw new InventoryError('not_found');
        return writeMovements(tx, current, [{
          at: new Date().toISOString(), batteryId, delta: qty, kind: 'receive',
          unitCost: opts?.unitCost ?? null, ...(cleanNote(opts?.note) ? { note: cleanNote(opts?.note) } : {}),
        }])[0];
      });
      invalidate();
      return m;
    },

    async adjustStock(batteryId, countedQuantity, note) {
      if (!Number.isInteger(countedQuantity) || countedQuantity < 0) throw new InventoryError('invalid_input', ['counted quantity must be an integer >= 0']);
      const m = await db.runTransaction(async (tx) => {
        const [b] = await readBatteries(tx, [batteryId]);
        if (!b) throw new InventoryError('not_found');
        const delta = countedQuantity - (b.quantity ?? 0);
        if (delta === 0) throw new InventoryError('no_change');
        return writeMovements(tx, [b], [{
          at: new Date().toISOString(), batteryId, delta, kind: b.quantity === undefined ? 'initial' : 'adjust',
          ...(cleanNote(note) ? { note: cleanNote(note) } : {}),
        }])[0];
      });
      invalidate();
      return m;
    },

    async createBattery(input, initialQuantity, by) {
      if (initialQuantity !== undefined && (!Number.isInteger(initialQuantity) || initialQuantity < 0)) {
        throw new InventoryError('invalid_input', ['initial quantity must be an integer >= 0']);
      }
      const created = await db.runTransaction(async (tx) => {
        const ref = col.batteries.doc(input.id);
        if ((await tx.get(ref)).exists) throw new InventoryError('conflict', ['a product with this id already exists']);
        const base: Battery = normaliseStock({ ...input, ...(initialQuantity === undefined ? {} : { quantity: 0 }) });
        let withStock = base;
        if (initialQuantity) {
          // writeMovements stores the ledger entry AND the battery document with the new quantity.
          writeMovements(tx, [base], [{ at: new Date().toISOString(), batteryId: base.id, delta: initialQuantity, kind: 'initial', note: 'opening stock' }]);
          withStock = applyMovements(base, [{ batteryId: base.id, delta: initialQuantity }]);
        } else {
          tx.set(ref, base);
        }
        tx.set(col.changes.doc(), { at: new Date().toISOString(), by, action: 'create', entity: 'battery', id: base.id, before: null, after: withStock });
        return withStock;
      });
      invalidate();
      return created;
    },

    async updateBattery(id, fields, by) {
      const after = await db.runTransaction(async (tx) => {
        const ref = col.batteries.doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new InventoryError('not_found');
        const before = snap.data() as Battery;
        const next = normaliseStock({ ...before, ...fields, id, ...(before.quantity === undefined ? {} : { quantity: before.quantity }) } as Battery);
        tx.set(ref, next);
        tx.set(col.changes.doc(), { at: new Date().toISOString(), by, action: 'update', entity: 'battery', id, before, after: next });
        return next;
      });
      invalidate();
      return after;
    },

    async removeBattery(id, by) {
      // Phase 1 (one transaction): the product must exist and must have no stock movement (every sale has one).
      await db.runTransaction(async (tx) => {
        const ref = col.batteries.doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new InventoryError('not_found');
        const used = await tx.get(col.movements.where('batteryId', '==', id).limit(1));
        if (!used.empty) throw new InventoryError('has_history', ['this product has stock movements or sales; hide it instead of deleting it']);
        tx.delete(ref);
        tx.set(col.changes.doc(), { at: new Date().toISOString(), by, action: 'delete', entity: 'battery', id, before: snap.data(), after: null });
      });
      // Phase 2: drop the id from fitment pins. Not part of the transaction (a transaction is limited to 500 writes);
      // it is idempotent and a failure here is reported by the data validator as unknown-battery-ref.
      const pinned = new Map<string, FirebaseFirestore.DocumentReference>();
      for (const field of ['include', 'exclude'] as const) {
        for (const d of (await col.fitments.where(field, 'array-contains', id).get()).docs) pinned.set(d.id, d.ref);
      }
      const refs = [...pinned.values()];
      for (const group of chunks(refs, 400)) {
        const batch = db.batch();
        for (const r of group) batch.update(r, { include: FieldValue.arrayRemove(id), exclude: FieldValue.arrayRemove(id) });
        await batch.commit();
      }
      invalidate();
      return { removedFromFitments: refs.length };
    },

    async getSale(id) {
      const snap = await col.sales.doc(id).get();
      return snap.exists ? (snap.data() as Sale) : null;
    },

    async listSales(range) {
      let q = col.sales.orderBy('soldAt', 'desc');
      if (range?.from) q = q.where('soldAt', '>=', range.from);
      if (range?.to) q = q.where('soldAt', '<', range.to);
      const sales = (await q.get()).docs.map((d) => d.data() as Sale);
      const voids: SaleVoid[] = [];
      for (const group of chunks(sales, 100)) {
        const snaps = await db.getAll(...group.map((s) => col.voids.doc(s.id)));
        for (const s of snaps) if (s.exists) voids.push(s.data() as SaleVoid);
      }
      return { sales, voids };
    },

    async listMovements(opts) {
      // Filtering by battery in memory avoids a composite index (equality + range on different fields).
      let rows: StockMovement[];
      if (opts?.batteryId) {
        rows = (await col.movements.where('batteryId', '==', opts.batteryId).get()).docs.map((d) => d.data() as StockMovement);
        rows = rows.filter((m) => inRange(m.at, opts.range));
      } else {
        let q = col.movements.orderBy('at', 'desc');
        if (opts?.range?.from) q = q.where('at', '>=', opts.range.from);
        if (opts?.range?.to) q = q.where('at', '<', opts.range.to);
        rows = (await q.get()).docs.map((d) => d.data() as StockMovement);
      }
      rows.sort((a, b) => b.at.localeCompare(a.at));
      return opts?.limit ? rows.slice(0, opts.limit) : rows;
    },
  };

  return { catalogue, inventory, invalidate };
}
