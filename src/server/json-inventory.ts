import { randomBytes } from 'node:crypto';
import type { ChangeEntry, DateRange, InventoryRepository } from '@core/repository';
import { applyMovements, checkCustomer, checkSale, movementsForSale, movementsForVoid, normaliseStock, saleTotal } from '@core/inventory';
import type { Battery, Fitment, NewMovement, Sale, SaleVoid, StockMovement } from '@core/types';
import { InventoryError } from './inventory-errors';
import type { JsonStore } from './json-store';

const rid = (prefix: string) => `${prefix}-${randomBytes(5).toString('hex')}`;
const inRange = (iso: string, r?: DateRange) => (!r?.from || iso >= r.from) && (!r?.to || iso < r.to);
const cleanNote = (n?: string) => (n?.trim() ? n.trim().slice(0, 500) : undefined);

/**
 * Sales, voids and the stock ledger on JSON files, sharing the store (and its write lock) with the catalogue.
 * JSON cannot make three files atomic. Write order is: sale/void first (the legal record is never lost),
 * then movements, then battery quantities. A crash in between is detectable by the data validator
 * (sale-without-movements, ledger-mismatch). The Firestore implementation does this in one transaction.
 */
export function createJsonInventory(store: JsonStore): InventoryRepository {
  const read = {
    batteries: () => store.read<Battery>('batteries'),
    sales: () => store.read<Sale>('sales', { optional: true }),
    voids: () => store.read<SaleVoid>('sale-voids', { optional: true }),
    movements: () => store.read<StockMovement>('movements', { optional: true }),
  };

  /** Append movements and store the updated battery states. Call only inside withLock. */
  async function commitMovements(batteries: Battery[], news: NewMovement[]): Promise<StockMovement[]> {
    const stored: StockMovement[] = news.map((m) => ({ ...m, id: rid('m') }));
    await store.write('movements', [...(await read.movements()), ...stored]);
    const touched = new Set(news.map((m) => m.batteryId));
    await store.write('batteries', batteries.map((b) => (touched.has(b.id) ? applyMovements(b, news) : b)));
    return stored;
  }

  /** Append to the shared change log. Call only inside withLock. */
  async function logChange(entity: ChangeEntry['entity'], action: ChangeEntry['action'], id: string, before: unknown, after: unknown, by: string) {
    const log = await store.read<ChangeEntry>('changes', { optional: true });
    await store.write('changes', [...log, { at: new Date().toISOString(), by, action, entity, id, before, after }]);
  }

  return {
    recordSale(input) {
      return store.withLock(async () => {
        const batteries = await read.batteries();
        const errors = [...checkCustomer(input.customer), ...checkSale(input, batteries)];
        if (errors.length) throw new InventoryError('invalid_sale', errors);

        // Name and cost are snapshots taken from the catalogue, never trusted from the client.
        const lines = input.lines.map((l) => {
          const b = batteries.find((x) => x.id === l.batteryId)!;
          return { batteryId: l.batteryId, name: b.name, qty: l.qty, unitPrice: l.unitPrice, unitCost: b.costPrice ?? null };
        });
        const soldAt = input.soldAt ?? new Date().toISOString();
        const sale: Sale = {
          id: `s-${soldAt.slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex')}`,
          soldAt, customer: input.customer, lines, discount: input.discount,
          total: saleTotal(lines, input.discount), paymentMethod: input.paymentMethod,
          ...(cleanNote(input.note) ? { note: cleanNote(input.note) } : {}),
        };
        await store.write('sales', [...(await read.sales()), sale]);
        await commitMovements(batteries, movementsForSale(sale));
        return sale;
      });
    },

    voidSale(saleId, reason) {
      return store.withLock(async () => {
        const sale = (await read.sales()).find((s) => s.id === saleId);
        if (!sale) throw new InventoryError('not_found');
        if (!reason.trim()) throw new InventoryError('invalid_input', ['a void needs a reason']);
        const voids = await read.voids();
        if (voids.some((v) => v.saleId === saleId)) throw new InventoryError('already_voided');
        const v: SaleVoid = { id: rid('v'), saleId, at: new Date().toISOString(), reason: reason.trim().slice(0, 500) };
        await store.write('sale-voids', [...voids, v]);
        await commitMovements(await read.batteries(), movementsForVoid(sale, v));
        return v;
      });
    },

    receiveStock(batteryId, qty, opts) {
      return store.withLock(async () => {
        if (!Number.isInteger(qty) || qty < 1) throw new InventoryError('invalid_input', ['qty must be a positive integer']);
        const batteries = await read.batteries();
        if (!batteries.some((b) => b.id === batteryId)) throw new InventoryError('not_found');
        const [m] = await commitMovements(batteries, [{
          at: new Date().toISOString(), batteryId, delta: qty, kind: 'receive',
          unitCost: opts?.unitCost ?? null, ...(cleanNote(opts?.note) ? { note: cleanNote(opts?.note) } : {}),
        }]);
        return m;
      });
    },

    adjustStock(batteryId, countedQuantity, note) {
      return store.withLock(async () => {
        if (!Number.isInteger(countedQuantity) || countedQuantity < 0) throw new InventoryError('invalid_input', ['counted quantity must be an integer >= 0']);
        const batteries = await read.batteries();
        const b = batteries.find((x) => x.id === batteryId);
        if (!b) throw new InventoryError('not_found');
        const delta = countedQuantity - (b.quantity ?? 0);
        if (delta === 0) throw new InventoryError('no_change');
        const [m] = await commitMovements(batteries, [{
          at: new Date().toISOString(), batteryId, delta, kind: b.quantity === undefined ? 'initial' : 'adjust',
          ...(cleanNote(note) ? { note: cleanNote(note) } : {}),
        }]);
        return m;
      });
    },

    createBattery(input, initialQuantity, by) {
      return store.withLock(async () => {
        if (initialQuantity !== undefined && (!Number.isInteger(initialQuantity) || initialQuantity < 0)) {
          throw new InventoryError('invalid_input', ['initial quantity must be an integer >= 0']);
        }
        const batteries = await read.batteries();
        if (batteries.some((b) => b.id === input.id)) throw new InventoryError('conflict', ['a product with this id already exists']);
        const created: Battery = normaliseStock({ ...input, ...(initialQuantity === undefined ? {} : { quantity: 0 }) });
        await store.write('batteries', [...batteries, created]);
        await logChange('battery', 'create', created.id, null, created, by);
        if (initialQuantity) {
          await commitMovements(await read.batteries(), [{ at: new Date().toISOString(), batteryId: created.id, delta: initialQuantity, kind: 'initial', note: 'opening stock' }]);
        }
        return (await read.batteries()).find((b) => b.id === created.id)!;
      });
    },

    updateBattery(id, fields, by) {
      return store.withLock(async () => {
        const batteries = await read.batteries();
        const before = batteries.find((b) => b.id === id);
        if (!before) throw new InventoryError('not_found');
        const after = normaliseStock({ ...before, ...fields, id, ...(before.quantity === undefined ? {} : { quantity: before.quantity }) } as Battery);
        await store.write('batteries', batteries.map((b) => (b.id === id ? after : b)));
        await logChange('battery', 'update', id, before, after, by);
        return after;
      });
    },

    removeBattery(id, by) {
      return store.withLock(async () => {
        const batteries = await read.batteries();
        const before = batteries.find((b) => b.id === id);
        if (!before) throw new InventoryError('not_found');
        const used = (await read.movements()).some((m) => m.batteryId === id) || (await read.sales()).some((s) => s.lines.some((l) => l.batteryId === id));
        if (used) throw new InventoryError('has_history', ['this product has stock movements or sales; hide it instead of deleting it']);
        await store.write('batteries', batteries.filter((b) => b.id !== id));
        const fitments = await store.read<Fitment>('fitments');
        let touched = 0;
        const cleaned = fitments.map((f) => {
          if (!f.include?.includes(id) && !f.exclude?.includes(id)) return f;
          touched++;
          return { ...f, ...(f.include ? { include: f.include.filter((x) => x !== id) } : {}), ...(f.exclude ? { exclude: f.exclude.filter((x) => x !== id) } : {}) };
        });
        if (touched) await store.write('fitments', cleaned);
        await logChange('battery', 'delete', id, before, { removedFromFitments: touched }, by);
        return { removedFromFitments: touched };
      });
    },

    async getSale(id) {
      return (await read.sales()).find((s) => s.id === id) ?? null;
    },

    async listSales(range) {
      const sales = (await read.sales()).filter((s) => inRange(s.soldAt, range)).sort((a, b) => b.soldAt.localeCompare(a.soldAt));
      const ids = new Set(sales.map((s) => s.id));
      return { sales, voids: (await read.voids()).filter((v) => ids.has(v.saleId)) };
    },

    async listMovements(opts) {
      const rows = (await read.movements())
        .filter((m) => (!opts?.batteryId || m.batteryId === opts.batteryId) && inRange(m.at, opts?.range))
        .sort((a, b) => b.at.localeCompare(a.at));
      return opts?.limit ? rows.slice(0, opts.limit) : rows;
    },
  };
}
