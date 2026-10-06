import { beforeEach, describe, expect, it } from 'vitest';
import { quantityFromMovements } from '@core/inventory';
import type { InventoryRepository, ReadRepository, WriteRepository } from '@core/repository';
import type { NewSale } from '@core/types';
import { InventoryError } from './inventory-errors';
import { battery, fitment } from './test-fixtures';

export interface Backend { catalogue: ReadRepository & WriteRepository; inventory: InventoryRepository }

const customer = { firstName: 'Nino', lastName: 'Beridze', idNumber: '01001012345' };
const sale = (o: Partial<NewSale> = {}): NewSale => ({
  customer, discount: 0, paymentMethod: 'cash',
  lines: [{ batteryId: 's60', name: 'client-sent-name', qty: 2, unitPrice: 210, unitCost: 1 }], ...o,
});
const one = (batteryId: string, qty: number, unitPrice = 200) => ({ batteryId, name: '', qty, unitPrice });
const failure = async (p: Promise<unknown>) => (await p.then(() => null, (e) => e)) as InventoryError;

/** The behaviour every backend (JSON files, Firestore) must share. `make` returns a fresh, EMPTY backend. */
export function repositoryContract(name: string, make: () => Promise<Backend>) {
  describe(`${name}: repository contract`, () => {
    let cat: Backend['catalogue'];
    let inv: Backend['inventory'];

    beforeEach(async () => {
      ({ catalogue: cat, inventory: inv } = await make());
      for (const b of [
        battery({ id: 's60', name: 'S60', oemCodes: ['0 092 S50 080', '560 409 054'], price: 215, costPrice: 150, quantity: 5 }),
        battery({ id: 'e70', name: 'E70', tech: 'EFB', ah: 70, cca: 640, caseCode: 'L3', price: 315, quantity: 1 }),
        battery({ id: 'unk', name: 'Unknown stock', quantity: undefined }),
        battery({ id: 'old', name: 'Old', oemCodes: ['9 999 OLD'], active: false }),
      ]) await cat.upsertBattery(b, 'seed');
      for (const f of [
        fitment({ id: 'car-bmw-3-1', engine: 'E90', yearFrom: 2005, yearTo: 2011 }),
        fitment({ id: 'car-bmw-3-2', engine: 'F30', yearFrom: 2011, yearTo: 2019 }),
        fitment({ id: 'car-audi-a3-1', make: 'Audi', model: 'A3', engine: '8V', startStop: true }, { techMin: 'EFB', caseCode: 'L3', ahMin: 70, ccaMin: 640 }),
        fitment({ id: 'van-fiat-doblo-1', type: 'van', make: 'Fiat', model: 'Doblo', engine: '1.3 MJT' }),
      ]) await cat.upsertFitment(f, 'seed');
    });

    describe('vehicle lists', () => {
      it('distinct sorted makes and models per vehicle type', async () => {
        expect(await cat.getMakes('car')).toEqual(['Audi', 'BMW']);
        expect(await cat.getMakes('van')).toEqual(['Fiat']);
        expect(await cat.getMakes('moto')).toEqual([]);
        expect(await cat.getModels('car', 'BMW')).toEqual(['3 series']);
        expect(await cat.getModels('car', 'Fiat')).toEqual([]);
      });
      it('engines filtered by year (inclusive edges) and sorted', async () => {
        const at = async (y?: number) => (await cat.getEngines('car', 'BMW', '3 series', y)).map((e) => e.fitmentId);
        expect(await at()).toEqual(['car-bmw-3-1', 'car-bmw-3-2']);
        expect(await at(2005)).toEqual(['car-bmw-3-1']);
        expect(await at(2011)).toEqual(['car-bmw-3-1', 'car-bmw-3-2']);
        expect(await at(2019)).toEqual(['car-bmw-3-2']);
        expect(await at(2020)).toEqual([]);
        expect((await cat.getEngines('car', 'BMW', '3 series'))[0]).toEqual({ fitmentId: 'car-bmw-3-1', label: 'E90', yearFrom: 2005, yearTo: 2011 });
      });
      it('lists follow fitment edits: move to another type, rename, delete', async () => {
        await cat.upsertFitment(fitment({ id: 'car-bmw-3-2', type: 'van', engine: 'F30 van', yearFrom: 2011, yearTo: 2019 }), 'admin');
        expect((await cat.getEngines('car', 'BMW', '3 series')).map((e) => e.fitmentId)).toEqual(['car-bmw-3-1']);
        expect((await cat.getEngines('van', 'BMW', '3 series')).map((e) => e.label)).toEqual(['F30 van']);
        await cat.deleteFitment('car-bmw-3-1', 'admin');
        expect(await cat.getModels('car', 'BMW')).toEqual([]);
        expect(await cat.getFitment('car-bmw-3-1')).toBeNull();
      });
    });

    describe('matching and old codes', () => {
      it('matches a fitment, [] for an unknown id, never inactive batteries', async () => {
        expect((await cat.findBatteriesForFitment('car-bmw-3-2')).map((m) => m.battery.id)).toEqual(['unk', 's60']); // same tier and stock: cheaper first
        expect(await cat.findBatteriesForFitment('nope')).toEqual([]);
      });
      it('sees a battery edit immediately (cache invalidated by own writes)', async () => {
        await cat.findBatteriesForFitment('car-bmw-3-2');
        await cat.upsertBattery(battery({ id: 's60', name: 'S60', price: 99 }), 'admin');
        expect((await cat.findBatteriesForFitment('car-bmw-3-2'))[0].battery.price).toBe(99);
      });
      it('old code: normalised, exact, active only', async () => {
        expect((await cat.findByOldCode('0 092-s50.080')).map((b) => b.id)).toEqual(['s60']);
        expect((await cat.findByOldCode('560409054')).map((b) => b.id)).toEqual(['s60']);
        expect(await cat.findByOldCode('560 409')).toEqual([]);
        expect(await cat.findByOldCode('9 999 OLD')).toEqual([]);
        expect(await cat.findByOldCode(' - . ')).toEqual([]);
      });
    });

    describe('active catalogue', () => {
      it('listActiveBatteries: active only, stable order by segment, tech, ah, id', async () => {
        for (const b of [
          battery({ id: 'z-car', tech: 'SMF', ah: 100 }),
          battery({ id: 'a-car', tech: 'SMF', ah: 60 }),
          battery({ id: 'm1', segment: 'moto', tech: 'AGM', ah: 12, cca: 210, caseCode: 'MOTO' }),
          battery({ id: 't1', segment: 'truck', ah: 100 }),
        ]) await cat.upsertBattery(b, 'seed');
        expect((await cat.listActiveBatteries()).map((b) => b.id))
          .toEqual(['e70', 'a-car', 's60', 'unk', 'z-car', 'm1', 't1']);
      });
      it('listActiveBatteries sees an upsert immediately: deactivate, edit, reactivate', async () => {
        expect((await cat.listActiveBatteries()).map((b) => b.id)).toContain('s60');
        await cat.upsertBattery(battery({ id: 's60', name: 'S60', active: false }), 'admin');
        expect((await cat.listActiveBatteries()).map((b) => b.id)).not.toContain('s60');
        await cat.upsertBattery(battery({ id: 's60', name: 'S60', price: 99 }), 'admin');
        expect((await cat.listActiveBatteries()).find((b) => b.id === 's60')).toMatchObject({ price: 99 });
      });
    });

    describe('catalogue writes', () => {
      it('upsert logs create then update with before/after; delete logs delete; missing delete is a no-op', async () => {
        await cat.upsertBattery(battery({ id: 'new', price: 100 }), 'admin');
        await cat.upsertBattery(battery({ id: 'new', price: 120 }), 'admin');
        await cat.deleteBattery('new', 'admin');
        await cat.deleteBattery('does-not-exist', 'admin');
        const log = (await cat.listChanges(100)).filter((c) => c.id === 'new');
        expect(log.map((c) => c.action)).toEqual(['delete', 'update', 'create']);
        expect(log[1]).toMatchObject({ entity: 'battery', by: 'admin', before: { price: 100 }, after: { price: 120 } });
        expect(log[2].before).toBeNull();
        expect(await cat.getBattery('new')).toBeNull();
        expect((await cat.listChanges(100)).some((c) => c.id === 'does-not-exist')).toBe(false);
      });
      it('parallel upserts all survive', async () => {
        await Promise.all(Array.from({ length: 15 }, (_, i) => cat.upsertBattery(battery({ id: `p${i}` }), 'admin')));
        const ids = (await cat.listBatteries()).map((b) => b.id);
        for (let i = 0; i < 15; i++) expect(ids).toContain(`p${i}`);
      });
      it('parallel fitment upserts keep the vehicle index complete', async () => {
        await Promise.all(Array.from({ length: 8 }, (_, i) => cat.upsertFitment(fitment({ id: `par-${i}`, make: 'Kia', model: `M${i}` }), 'admin')));
        expect(await cat.getModels('car', 'Kia')).toEqual(Array.from({ length: 8 }, (_, i) => `M${i}`));
      }, 20_000);
      it('listChanges is newest first and limited', async () => {
        for (let i = 0; i < 3; i++) await cat.upsertBattery(battery({ id: `c${i}` }), 'admin');
        expect((await cat.listChanges(2)).map((c) => c.id)).toEqual(['c2', 'c1']);
      });
    });

    describe('sales', () => {
      it('records a sale: ledger entry, lower stock, snapshots from the catalogue', async () => {
        const s = await inv.recordSale(sale({ discount: 20, note: '  paid on site ' }));
        expect(s).toMatchObject({ total: 400, discount: 20, note: 'paid on site', customer, lines: [{ name: 'S60', unitCost: 150, unitPrice: 210 }] });
        expect(s.id).toMatch(/^s-\d{8}-[0-9a-f]{6}$/);
        expect((await cat.getBattery('s60'))!.quantity).toBe(3);
        expect(await inv.getSale(s.id)).toEqual(s);
        const m = await inv.listMovements({ batteryId: 's60' });
        expect(m).toHaveLength(1);
        expect(m[0]).toMatchObject({ delta: -2, kind: 'sale', saleId: s.id });
      });
      it('selling the last unit marks the battery out', async () => {
        await inv.recordSale(sale({ lines: [one('e70', 1, 300)] }));
        expect(await cat.getBattery('e70')).toMatchObject({ quantity: 0, stock: 'out' });
      });
      it('refuses overselling, unknown stock, bad customers — and changes nothing', async () => {
        const e1 = await failure(inv.recordSale(sale({ lines: [one('s60', 6)] })));
        expect(e1.code).toBe('invalid_sale');
        expect(e1.details[0]).toMatch(/only 5 in stock/);
        expect((await failure(inv.recordSale(sale({ lines: [one('unk', 1)] })))).details[0]).toMatch(/unknown/);
        expect((await failure(inv.recordSale(sale({ customer: { firstName: 'A', lastName: 'B' } })))).details).toEqual(['customer needs an ID number or an IBAN']);
        expect((await cat.getBattery('s60'))!.quantity).toBe(5);
        expect((await inv.listSales()).sales).toEqual([]);
        expect(await inv.listMovements()).toEqual([]);
      });
      it('parallel sales of the same stock can never oversell', async () => {
        const results = await Promise.allSettled(Array.from({ length: 4 }, () => inv.recordSale(sale({ lines: [one('s60', 2)] }))));
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
        expect((await cat.getBattery('s60'))!.quantity).toBe(1);
        expect(quantityFromMovements(await inv.listMovements({ batteryId: 's60' }))).toBe(-4);
      }, 20_000); // deliberate contention: Firestore retries the losing transactions, which can exceed the 5 s default on a busy machine
      it('lists by date range (to exclusive), newest first, with limit on movements', async () => {
        const a = await inv.recordSale(sale({ soldAt: '2026-10-01T10:00:00.000Z', lines: [one('s60', 1)] }));
        const b = await inv.recordSale(sale({ soldAt: '2026-10-02T10:00:00.000Z', lines: [one('s60', 1)] }));
        const c = await inv.recordSale(sale({ soldAt: '2026-10-03T10:00:00.000Z', lines: [one('s60', 1)] }));
        const ids = async (r?: { from?: string; to?: string }) => (await inv.listSales(r)).sales.map((s) => s.id);
        expect(await ids()).toEqual([c.id, b.id, a.id]);
        expect(await ids({ from: '2026-10-02T00:00:00.000Z', to: '2026-10-03T10:00:00.000Z' })).toEqual([b.id]);
        expect(await inv.listMovements({ limit: 2 })).toHaveLength(2);
      });
    });

    describe('product create, update, delete', () => {
      const fresh = (o: Partial<Parameters<typeof inv.createBattery>[0]> = {}) => {
        const { quantity: _q, ...rest } = battery({ id: 'new-1', name: 'New one', price: 100, ...o });
        void _q;
        return rest;
      };
      it('creates a product; the opening quantity goes through the ledger as an "initial" movement', async () => {
        const b = await inv.createBattery(fresh(), 7, 'admin');
        expect(b).toMatchObject({ id: 'new-1', quantity: 7, stock: 'in' });
        expect(await cat.getBattery('new-1')).toMatchObject({ quantity: 7 });
        expect(await inv.listMovements({ batteryId: 'new-1' })).toMatchObject([{ kind: 'initial', delta: 7 }]);
        expect((await cat.listActiveBatteries()).map((x) => x.id)).toContain('new-1');
        expect((await cat.listChanges(5)).find((c) => c.id === 'new-1')).toMatchObject({ action: 'create', entity: 'battery' });
      });
      it('opening quantity 0 → out of stock, no movement; undefined → quantity unknown', async () => {
        expect(await inv.createBattery(fresh({ id: 'zero' }), 0, 'admin')).toMatchObject({ quantity: 0, stock: 'out' });
        expect(await inv.listMovements({ batteryId: 'zero' })).toEqual([]);
        expect((await inv.createBattery(fresh({ id: 'unknown' }), undefined, 'admin')).quantity).toBeUndefined();
      });
      it('refuses a duplicate id and a bad quantity, and stores nothing', async () => {
        await inv.createBattery(fresh(), 1, 'admin');
        expect((await failure(inv.createBattery(fresh({ name: 'again' }), 5, 'admin'))).code).toBe('conflict');
        expect((await failure(inv.createBattery(fresh({ id: 'x2' }), -1, 'admin'))).code).toBe('invalid_input');
        expect((await failure(inv.createBattery(fresh({ id: 'x3' }), 1.5, 'admin'))).code).toBe('invalid_input');
        expect(await cat.getBattery('x2')).toBeNull();
        expect((await cat.getBattery('new-1'))!.quantity).toBe(1);
      });
      it('a new product is matched to cars by the rules without touching any fitment', async () => {
        await inv.createBattery(fresh({ id: 'fits-bmw', polarity: 'R+', caseCode: 'L2', ah: 60, cca: 540, price: 50 }), 3, 'admin');
        expect((await cat.findBatteriesForFitment('car-bmw-3-2'))[0].battery.id).toBe('fits-bmw'); // cheapest OEM-equivalent first
      });
      it('updates catalogue fields but never the quantity; keeps stock consistent; unknown id → not_found', async () => {
        const b = await inv.updateBattery('s60', { price: 99, name: 'S60 renamed', active: false }, 'admin');
        expect(b).toMatchObject({ price: 99, name: 'S60 renamed', active: false, quantity: 5 });
        expect((await cat.listActiveBatteries()).map((x) => x.id)).not.toContain('s60');
        expect((await cat.listChanges(3))[0]).toMatchObject({ action: 'update', id: 's60', before: { price: 215 }, after: { price: 99 } });
        expect((await failure(inv.updateBattery('nope', { price: 1 }, 'admin'))).code).toBe('not_found');
        await inv.updateBattery('s60', { stock: 'out' }, 'admin'); // contradicts quantity 5 → corrected
        expect((await cat.getBattery('s60'))!.stock).toBe('in');
      });
      it('removes a product without history and cleans it out of every fitment pin', async () => {
        await cat.upsertFitment(fitment({ id: 'pin-1', make: 'Kia', model: 'Rio', include: ['e70', 'unk'], exclude: ['unk'] }), 'seed');
        await cat.upsertFitment(fitment({ id: 'pin-2', make: 'Kia', model: 'Ceed', include: ['unk'] }), 'seed');
        await cat.upsertFitment(fitment({ id: 'pin-3', make: 'Kia', model: 'Soul' }), 'seed');
        expect(await inv.removeBattery('unk', 'admin')).toEqual({ removedFromFitments: 2 });
        expect(await cat.getBattery('unk')).toBeNull();
        expect(await cat.getFitment('pin-1')).toMatchObject({ include: ['e70'] });
        expect((await cat.getFitment('pin-1'))!.exclude ?? []).toEqual([]);
        expect((await cat.getFitment('pin-2'))!.include ?? []).toEqual([]);
        expect((await cat.listChanges(5)).find((c) => c.action === 'delete')).toMatchObject({ id: 'unk', entity: 'battery' });
        expect((await failure(inv.removeBattery('unk', 'admin'))).code).toBe('not_found');
      });
      it('refuses to delete a product that has any stock movement or sale; hiding it still works', async () => {
        await inv.recordSale(sale({ lines: [one('s60', 1)] }));
        const err = await failure(inv.removeBattery('s60', 'admin'));
        expect(err.code).toBe('has_history');
        expect(await cat.getBattery('s60')).not.toBeNull();
        await inv.receiveStock('e70', 1);
        expect((await failure(inv.removeBattery('e70', 'admin'))).code).toBe('has_history');
        await inv.updateBattery('s60', { active: false }, 'admin');
        expect((await cat.listActiveBatteries()).map((x) => x.id)).not.toContain('s60');
      });
    });

    describe('voids', () => {
      it('returns the stock, keeps the sale, and refuses a second void', async () => {
        const s = await inv.recordSale(sale());
        const v = await inv.voidSale(s.id, ' wrong battery ');
        expect(v).toMatchObject({ saleId: s.id, reason: 'wrong battery' });
        expect((await cat.getBattery('s60'))!.quantity).toBe(5);
        const { sales, voids } = await inv.listSales();
        expect(sales).toHaveLength(1);
        expect(voids).toEqual([v]);
        expect((await failure(inv.voidSale(s.id, 'again'))).code).toBe('already_voided');
        expect((await cat.getBattery('s60'))!.quantity).toBe(5);
      });
      it('unknown sale, empty reason, and a sold-out battery coming back to "in"', async () => {
        expect((await failure(inv.voidSale('nope', 'x'))).code).toBe('not_found');
        const s = await inv.recordSale(sale({ lines: [one('e70', 1, 300)] }));
        expect((await failure(inv.voidSale(s.id, '  '))).code).toBe('invalid_input');
        await inv.voidSale(s.id, 'returned');
        expect(await cat.getBattery('e70')).toMatchObject({ quantity: 1, stock: 'in' });
      });
    });

    describe('receive and adjust', () => {
      it('receives stock with cost and note', async () => {
        const m = await inv.receiveStock('s60', 10, { unitCost: 140, note: 'delivery 12' });
        expect(m).toMatchObject({ delta: 10, kind: 'receive', unitCost: 140, note: 'delivery 12' });
        expect((await cat.getBattery('s60'))!.quantity).toBe(15);
      });
      it('rejects bad quantities and unknown batteries', async () => {
        expect((await failure(inv.receiveStock('s60', 0))).code).toBe('invalid_input');
        expect((await failure(inv.receiveStock('s60', 1.5))).code).toBe('invalid_input');
        expect((await failure(inv.receiveStock('zz', 1))).code).toBe('not_found');
      });
      it('adjusts to the counted quantity; unknown stock gets an "initial" entry; zero marks out', async () => {
        expect(await inv.adjustStock('s60', 3, 'recount')).toMatchObject({ delta: -2, kind: 'adjust' });
        expect(await inv.adjustStock('unk', 7)).toMatchObject({ delta: 7, kind: 'initial' });
        expect(await cat.getBattery('unk')).toMatchObject({ quantity: 7 });
        expect((await failure(inv.adjustStock('s60', 3))).code).toBe('no_change');
        expect((await failure(inv.adjustStock('s60', -1))).code).toBe('invalid_input');
        await inv.adjustStock('s60', 0);
        expect(await cat.getBattery('s60')).toMatchObject({ quantity: 0, stock: 'out' });
      });
    });
  });
}
