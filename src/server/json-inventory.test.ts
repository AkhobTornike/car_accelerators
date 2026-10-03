import { beforeEach, describe, expect, it } from 'vitest';
import { quantityFromMovements } from '@core/inventory';
import type { NewSale } from '@core/types';
import { InventoryError } from './inventory-errors';
import { createJsonInventory } from './json-inventory';
import { createJsonRepository } from './json-repository';
import { JsonStore } from './json-store';
import { battery, makeDataDir } from './test-fixtures';

const customer = { firstName: 'Nino', lastName: 'Beridze', idNumber: '01001012345' };
const sale = (o: Partial<NewSale> = {}): NewSale => ({
  customer, discount: 0, paymentMethod: 'cash',
  lines: [{ batteryId: 's60', name: 'client-sent-name', qty: 2, unitPrice: 210, unitCost: 1 }], ...o,
});

let inv: ReturnType<typeof createJsonInventory>;
let cat: ReturnType<typeof createJsonRepository>;
beforeEach(async () => {
  const store = new JsonStore(await makeDataDir({ batteries: [battery({ id: 's60', quantity: 5, costPrice: 150 }), battery({ id: 'e70', quantity: 1, price: 315 }), battery({ id: 'unk', quantity: undefined })] }));
  inv = createJsonInventory(store);
  cat = createJsonRepository(store);
});

const failure = async (p: Promise<unknown>) => (await p.then(() => null, (e) => e)) as InventoryError;

describe('recordSale', () => {
  it('stores the sale, writes ledger entries and lowers the stock', async () => {
    const s = await inv.recordSale(sale({ discount: 20, note: '  paid on site ' }));
    expect(s).toMatchObject({ total: 400, discount: 20, paymentMethod: 'cash', note: 'paid on site', customer });
    expect(s.id).toMatch(/^s-\d{8}-[0-9a-f]{6}$/);
    expect((await cat.getBattery('s60'))!.quantity).toBe(3);
    expect(await inv.getSale(s.id)).toEqual(s);
    const m = await inv.listMovements({ batteryId: 's60' });
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ delta: -2, kind: 'sale', saleId: s.id });
  });
  it('takes name and cost from the catalogue, not from the client', async () => {
    const s = await inv.recordSale(sale());
    expect(s.lines[0]).toMatchObject({ name: 's60', unitCost: 150, unitPrice: 210 });
  });
  it('flips the stock status when the last unit is sold', async () => {
    await inv.recordSale(sale({ lines: [{ batteryId: 'e70', name: '', qty: 1, unitPrice: 300 }] }));
    expect(await cat.getBattery('e70')).toMatchObject({ quantity: 0, stock: 'out' });
  });
  it('refuses overselling, unknown stock and bad customers — and changes nothing', async () => {
    const e1 = await failure(inv.recordSale(sale({ lines: [{ batteryId: 's60', name: '', qty: 6, unitPrice: 1 }] })));
    expect(e1.code).toBe('invalid_sale');
    expect(e1.details[0]).toMatch(/only 5 in stock/);
    expect((await failure(inv.recordSale(sale({ lines: [{ batteryId: 'unk', name: '', qty: 1, unitPrice: 1 }] })))).details[0]).toMatch(/unknown/);
    expect((await failure(inv.recordSale(sale({ customer: { firstName: 'A', lastName: 'B' } })))).details).toEqual(['customer needs an ID number or an IBAN']);
    expect((await cat.getBattery('s60'))!.quantity).toBe(5);
    expect((await inv.listSales()).sales).toEqual([]);
    expect(await inv.listMovements()).toEqual([]);
  });
  it('parallel sales of the last units cannot oversell', async () => {
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => inv.recordSale(sale({ lines: [{ batteryId: 's60', name: '', qty: 2, unitPrice: 200 }] }))));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect((await cat.getBattery('s60'))!.quantity).toBe(1);
    expect(quantityFromMovements(await inv.listMovements({ batteryId: 's60' }))).toBe(-4);
  });
});

describe('voidSale', () => {
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
  it('unknown sale and empty reason', async () => {
    expect((await failure(inv.voidSale('nope', 'x'))).code).toBe('not_found');
    const s = await inv.recordSale(sale());
    expect((await failure(inv.voidSale(s.id, '  '))).code).toBe('invalid_input');
  });
  it('brings a sold-out battery back to "in"', async () => {
    const s = await inv.recordSale(sale({ lines: [{ batteryId: 'e70', name: '', qty: 1, unitPrice: 300 }] }));
    await inv.voidSale(s.id, 'returned');
    expect(await cat.getBattery('e70')).toMatchObject({ quantity: 1, stock: 'in' });
  });
});

describe('receiveStock and adjustStock', () => {
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
  it('adjusts to the counted quantity; a battery with unknown stock gets an "initial" entry', async () => {
    expect(await inv.adjustStock('s60', 3, 'recount')).toMatchObject({ delta: -2, kind: 'adjust' });
    expect(await inv.adjustStock('unk', 7)).toMatchObject({ delta: 7, kind: 'initial' });
    expect((await cat.getBattery('unk'))).toMatchObject({ quantity: 7 });
    expect((await failure(inv.adjustStock('s60', 3))).code).toBe('no_change');
    expect((await failure(inv.adjustStock('s60', -1))).code).toBe('invalid_input');
  });
  it('adjusting to zero marks the battery out of stock', async () => {
    await inv.adjustStock('s60', 0);
    expect(await cat.getBattery('s60')).toMatchObject({ quantity: 0, stock: 'out' });
  });
});

describe('listing', () => {
  it('filters by date range (to is exclusive) and newest first', async () => {
    const a = await inv.recordSale(sale({ soldAt: '2026-10-01T10:00:00.000Z', lines: [{ batteryId: 's60', name: '', qty: 1, unitPrice: 200 }] }));
    const b = await inv.recordSale(sale({ soldAt: '2026-10-02T10:00:00.000Z', lines: [{ batteryId: 's60', name: '', qty: 1, unitPrice: 200 }] }));
    const c = await inv.recordSale(sale({ soldAt: '2026-10-03T10:00:00.000Z', lines: [{ batteryId: 's60', name: '', qty: 1, unitPrice: 200 }] }));
    const ids = async (r?: { from?: string; to?: string }) => (await inv.listSales(r)).sales.map((s) => s.id);
    expect(await ids()).toEqual([c.id, b.id, a.id]);
    expect(await ids({ from: '2026-10-02T00:00:00.000Z', to: '2026-10-03T10:00:00.000Z' })).toEqual([b.id]);
    expect(await inv.listMovements({ limit: 2 })).toHaveLength(2);
  });
  it('shares the write lock with catalogue edits (price change during a sale is not lost)', async () => {
    await Promise.all([inv.recordSale(sale()), cat.upsertBattery(battery({ id: 'zzz', quantity: 1 }), 'admin'), inv.receiveStock('e70', 2)]);
    const ids = (await cat.listBatteries()).map((b) => b.id);
    expect(ids).toContain('zzz');
    expect((await cat.getBattery('s60'))!.quantity).toBe(3);
    expect((await cat.getBattery('e70'))!.quantity).toBe(3);
  });
});
