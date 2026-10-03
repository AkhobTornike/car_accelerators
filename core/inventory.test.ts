import { describe, expect, it } from 'vitest';
import { InsufficientStockError, applyMovements, checkCustomer, checkSale, movementsForSale, movementsForVoid, quantityFromMovements, saleTotal } from './inventory.ts';
import type { Battery, Sale, SaleLine } from './types.ts';

const bat = (id: string, quantity: number | undefined, stock: Battery['stock'] = 'in'): Battery => ({
  id, brand: 'AMPER', name: id, segment: 'car', tech: 'SMF', voltage: 12, ah: 60, cca: 540, polarity: 'R+', caseCode: 'L2',
  dimsMm: { l: 1, w: 1, h: 1 }, warrantyMonths: 24, price: 200, stock, quantity, oemCodes: [], active: true,
});
const line = (batteryId: string, qty: number, unitPrice = 200): SaleLine => ({ batteryId, name: batteryId, qty, unitPrice });
const sale = (lines: SaleLine[], discount = 0): Sale => ({
  id: 's1', soldAt: '2026-10-03T10:00:00.000Z', customer: { firstName: 'A', lastName: 'B', idNumber: '01001012345' },
  lines, discount, total: saleTotal(lines, discount), paymentMethod: 'cash',
});

describe('saleTotal', () => {
  it('sums lines and subtracts the discount, rounded to 2 decimals', () => {
    expect(saleTotal([line('a', 2, 100.1), line('b', 1, 50)], 10)).toBe(240.2);
    expect(saleTotal([line('a', 3, 0.1)], 0)).toBe(0.3);
  });
});

describe('checkSale', () => {
  const stock = [bat('a', 5), bat('b', 1), bat('u', undefined)];
  it('accepts a sale that fits the stock', () => expect(checkSale({ lines: [line('a', 5), line('b', 1)], discount: 0 }, stock)).toEqual([]));
  it('rejects overselling, also across lines of the same battery', () => {
    expect(checkSale({ lines: [line('b', 2)], discount: 0 }, stock)[0]).toMatch(/only 1 in stock/);
    expect(checkSale({ lines: [line('a', 3), line('a', 3)], discount: 0 }, stock)[0]).toMatch(/only 5 in stock, 6 requested/);
  });
  it('rejects unknown battery, unknown quantity, bad qty, empty sale, bad discount', () => {
    expect(checkSale({ lines: [line('zz', 1)], discount: 0 }, stock)[0]).toMatch(/unknown battery/);
    expect(checkSale({ lines: [line('u', 1)], discount: 0 }, stock)[0]).toMatch(/quantity is unknown/);
    expect(checkSale({ lines: [line('a', 0)], discount: 0 }, stock)[0]).toMatch(/positive integer/);
    expect(checkSale({ lines: [line('a', 1.5)], discount: 0 }, stock)[0]).toMatch(/positive integer/);
    expect(checkSale({ lines: [], discount: 0 }, stock)).toContain('sale has no lines');
    expect(checkSale({ lines: [line('a', 1)], discount: -5 }, stock)).toContain('discount must be >= 0');
    expect(checkSale({ lines: [line('a', 1, 100)], discount: 150 }, stock)).toContain('discount exceeds the sale amount');
  });
});

describe('ledger', () => {
  it('a sale and its void cancel out', () => {
    const s = sale([line('a', 2), line('b', 1)]);
    const out = movementsForSale(s);
    const back = movementsForVoid(s, { id: 'v1', saleId: 's1', at: '2026-10-04T00:00:00.000Z', reason: 'wrong battery' });
    expect(out.map((m) => m.delta)).toEqual([-2, -1]);
    expect(quantityFromMovements([...out, ...back])).toBe(0);
    expect(back[0]).toMatchObject({ kind: 'sale-void', saleId: 's1', note: 'wrong battery' });
  });
});

describe('applyMovements', () => {
  it('updates quantity and ignores other batteries', () => {
    const r = applyMovements(bat('a', 5), [{ batteryId: 'a', delta: -2 }, { batteryId: 'b', delta: -99 }, { batteryId: 'a', delta: 1 }]);
    expect(r.quantity).toBe(4);
  });
  it('flips stock status at zero and back, but never touches "order"', () => {
    expect(applyMovements(bat('a', 1), [{ batteryId: 'a', delta: -1 }]).stock).toBe('out');
    expect(applyMovements(bat('a', 0, 'out'), [{ batteryId: 'a', delta: 3 }])).toMatchObject({ stock: 'in', quantity: 3 });
    expect(applyMovements(bat('a', 1, 'order'), [{ batteryId: 'a', delta: -1 }]).stock).toBe('order');
    expect(applyMovements(bat('a', 0, 'order'), [{ batteryId: 'a', delta: 2 }]).stock).toBe('order');
  });
  it('treats unknown quantity as zero and never goes negative', () => {
    expect(applyMovements(bat('a', undefined, 'out'), [{ batteryId: 'a', delta: 4 }])).toMatchObject({ quantity: 4, stock: 'in' });
    expect(() => applyMovements(bat('a', 1), [{ batteryId: 'a', delta: -2 }])).toThrow(InsufficientStockError);
  });
  it('does not mutate its input', () => {
    const b = bat('a', 5);
    applyMovements(b, [{ batteryId: 'a', delta: -5 }]);
    expect(b).toMatchObject({ quantity: 5, stock: 'in' });
  });
});

describe('checkCustomer', () => {
  const ok = { firstName: 'Nino', lastName: 'Beridze' };
  it('accepts a personal number, a company ID or an IBAN', () => {
    expect(checkCustomer({ ...ok, idNumber: '01001012345' })).toEqual([]);
    expect(checkCustomer({ ...ok, idNumber: '204512345' })).toEqual([]);
    expect(checkCustomer({ ...ok, iban: 'GE29NB0000000101904917' })).toEqual([]);
  });
  it('needs a name and at least one identifier', () => {
    expect(checkCustomer({ firstName: ' ', lastName: '' , idNumber: '01001012345' })).toHaveLength(2);
    expect(checkCustomer(ok)).toEqual(['customer needs an ID number or an IBAN']);
  });
  it('rejects malformed identifiers', () => {
    expect(checkCustomer({ ...ok, idNumber: '1234567890' })).toEqual(['ID number must be 9 or 11 digits']);
    expect(checkCustomer({ ...ok, idNumber: '0100101234a' })).toHaveLength(1);
    expect(checkCustomer({ ...ok, iban: 'ge29nb0000000101904917' })).toHaveLength(1);
    expect(checkCustomer({ ...ok, iban: 'DE89370400440532013000' })).toHaveLength(1);
  });
});
