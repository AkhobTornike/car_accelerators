import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateData, type Issue } from './validate-data.ts';
import { saleTotal as coreSaleTotal } from '../core/inventory.ts';
import type { Battery, Fitment } from '../core/types.ts';

const bat = (o: Partial<Battery> & { id: string }): Battery => ({
  brand: 'AMPER', name: o.id, segment: 'car', tech: 'SMF', voltage: 12, ah: 60, cca: 540, polarity: 'R+',
  caseCode: 'L2', dimsMm: { l: 242, w: 175, h: 190 }, warrantyMonths: 24, price: 200, stock: 'in',
  oemCodes: [`OEM-${o.id}`], active: true, ...o,
});

const fit = (o: Partial<Fitment> = {}, oem: Partial<Fitment['oem']> = {}): Fitment => ({
  id: 'f1', type: 'car', make: 'Test', model: 'T', engine: '1.6', yearFrom: 2010, yearTo: 2015, startStop: false,
  oem: { ahMin: 60, ccaMin: 540, polarity: 'R+', caseCode: 'L2', techMin: 'SMF', ...oem },
  source: 'demo', verified: false, ...o,
});

const sale = (o: Record<string, unknown> = {}) => ({
  id: 's1', soldAt: '2026-01-10T10:00:00Z', customer: { firstName: 'A', lastName: 'B', idNumber: '123456789' },
  lines: [{ batteryId: 'b1', name: 'b1', qty: 2, unitPrice: 100 }], discount: 10, total: 190, paymentMethod: 'cash', ...o,
});

const mov = (o: Record<string, unknown> = {}) => ({
  id: 'm1', at: '2026-01-09T10:00:00Z', batteryId: 'b1', delta: 5, kind: 'initial', ...o,
});

const codes = (issues: Issue[]) => issues.map((i) => i.code);

describe('schema failures', () => {
  it('battery with a missing field', () => {
    const { name, ...rest } = bat({ id: 'b1' });
    void name;
    expect(codes(validateData([rest, bat({ id: 'b2' })], [fit({ include: ['b2'] })]))).toEqual(['schema']);
  });
  it('battery with a wrong enum', () => {
    expect(codes(validateData([bat({ id: 'b1', segment: 'boat' as 'car' }), bat({ id: 'b2' })], [fit({ include: ['b2'] })]))).toEqual(['schema']);
  });
  it('fitment with an extra property', () => {
    expect(codes(validateData([bat({ id: 'b1' })], [{ ...fit({ include: ['b1'] }), foo: 1 }]))).toEqual(['schema']);
  });
  it('sale with a missing total', () => {
    const { total, ...rest } = sale();
    void total;
    const issues = validateData([bat({ id: 'b1' })], [fit()], { sales: [rest], voids: [], movements: [] });
    expect(issues.every((i) => i.code === 'schema')).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
  });
  it('movement with a zero delta', () => {
    const issues = validateData([bat({ id: 'b1' })], [fit()], { sales: [], voids: [], movements: [mov({ delta: 0 })] });
    expect(codes(issues)).toEqual(['schema']);
  });
});

describe('battery and fitment checks', () => {
  it('duplicate-id', () => {
    expect(codes(validateData([bat({ id: 'b1' }), bat({ id: 'b1' })], [fit({ include: ['b1'] })]))).toEqual(['duplicate-id']);
    expect(validateData([bat({ id: 'b1' }), bat({ id: 'b2' })], [fit({ include: ['b1'] })])).toEqual([]);
  });
  it('bad-year-range', () => {
    expect(codes(validateData([bat({ id: 'b1' })], [fit({ yearFrom: 2020, yearTo: 2010 })]))).toEqual(['bad-year-range']);
    expect(validateData([bat({ id: 'b1' })], [fit({ yearFrom: 2010, yearTo: 2020 })])).toEqual([]);
  });
  it('year-overlap: touching counts, adjacent does not', () => {
    const touching = [fit({ id: 'f1', yearFrom: 2010, yearTo: 2015 }), fit({ id: 'f2', yearFrom: 2015, yearTo: 2020 })];
    expect(codes(validateData([bat({ id: 'b1' })], touching))).toEqual(['year-overlap']);
    const adjacent = [fit({ id: 'f1', yearFrom: 2010, yearTo: 2015 }), fit({ id: 'f2', yearFrom: 2016, yearTo: 2020 })];
    expect(validateData([bat({ id: 'b1' })], adjacent)).toEqual([]);
  });
  it('unknown-battery-ref', () => {
    expect(codes(validateData([bat({ id: 'b1' })], [fit({ include: ['ghost'] })]))).toEqual(['unknown-battery-ref']);
    expect(validateData([bat({ id: 'b1' })], [fit({ include: ['b1'] })])).toEqual([]);
  });
  it('include-exclude-conflict', () => {
    const bs = [bat({ id: 'b1' }), bat({ id: 'b2' })];
    expect(codes(validateData(bs, [fit({ include: ['b1'], exclude: ['b1'] })]))).toEqual(['include-exclude-conflict']);
    expect(validateData(bs, [fit({ include: ['b1'] })])).toEqual([]);
  });
  it('duplicate-oem-code', () => {
    const bs = [bat({ id: 'b1', oemCodes: ['0 092 X'] }), bat({ id: 'b2', oemCodes: ['0-092.x'] })];
    const issues = validateData(bs, [fit({ include: ['b1', 'b2'] })]);
    expect(codes(issues)).toEqual(['duplicate-oem-code']);
    expect(issues[0].level).toBe('warning');
    expect(validateData([bat({ id: 'b1' }), bat({ id: 'b2' })], [fit({ include: ['b1'] })])).toEqual([]);
  });
  it('quantity-stock-mismatch', () => {
    expect(codes(validateData([bat({ id: 'b1', stock: 'in', quantity: 0 })], [fit({ include: ['b1'] })]))).toEqual(['quantity-stock-mismatch']);
    expect(validateData([bat({ id: 'b1', stock: 'in', quantity: 5 })], [fit({ include: ['b1'] })])).toEqual([]);
    expect(validateData([bat({ id: 'b1', stock: 'in' })], [fit({ include: ['b1'] })])).toEqual([]);
  });
  it('ah-window-empty', () => {
    expect(codes(validateData([bat({ id: 'b1' })], [fit({ include: ['b1'] }, { ahMin: 60, ahMax: 55 })]))).toEqual(['ah-window-empty']);
    expect(validateData([bat({ id: 'b1' })], [fit({ include: ['b1'] }, { ahMin: 60, ahMax: 70 })])).toEqual([]);
  });
  it('no-match', () => {
    const issues = validateData([bat({ id: 'b1' })], [fit({}, { ahMin: 200 })]);
    expect(codes(issues)).toEqual(['no-match']);
    expect(issues[0].level).toBe('warning');
    expect(validateData([bat({ id: 'b1' })], [fit({ include: ['b1'] })])).toEqual([]);
  });
});

describe('inventory checks', () => {
  it('sale-total-mismatch', () => {
    const extra = { sales: [sale({ total: 191 })], voids: [], movements: [mov({ delta: 10 }), mov({ id: 'm2', delta: -2, kind: 'sale', saleId: 's1' })] };
    expect(codes(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], extra))).toEqual(['sale-total-mismatch']);
    const okExtra = { sales: [sale()], voids: [], movements: [mov({ delta: 10 }), mov({ id: 'm2', delta: -2, kind: 'sale', saleId: 's1' })] };
    expect(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], okExtra)).toEqual([]);
  });
  it('sale-unknown-battery', () => {
    const bad = sale({ lines: [{ batteryId: 'ghost', name: 'g', qty: 1, unitPrice: 100 }], discount: 0, total: 100 });
    const issues = validateData([bat({ id: 'b1' })], [fit()], { sales: [bad], voids: [], movements: [] });
    expect(codes(issues)).toEqual(['sale-unknown-battery', 'sale-without-movements']);
    expect(codes(validateData([bat({ id: 'b1' })], [fit()], { sales: [sale()], voids: [], movements: [] }))).not.toContain('sale-unknown-battery');
  });
  it('void-unknown-sale', () => {
    const extra = { sales: [], voids: [{ id: 'v1', saleId: 'ghost', at: '2026-01-11T10:00:00Z', reason: 'x' }], movements: [] };
    expect(codes(validateData([bat({ id: 'b1' })], [fit()], extra))).toEqual(['void-unknown-sale']);
    const okExtra = { sales: [sale()], voids: [{ id: 'v1', saleId: 's1', at: '2026-01-11T10:00:00Z', reason: 'x' }], movements: [] };
    const ok = validateData([bat({ id: 'b1' })], [fit()], okExtra);
    expect(codes(ok).filter((c) => c === 'void-unknown-sale')).toEqual([]);
  });
  it('void-duplicate', () => {
    const two = [
      { id: 'v1', saleId: 's1', at: '2026-01-11T10:00:00Z', reason: 'x' },
      { id: 'v2', saleId: 's1', at: '2026-01-12T10:00:00Z', reason: 'y' },
    ];
    const moves = [mov({ delta: 10 }), mov({ id: 'm2', delta: -2, kind: 'sale', saleId: 's1' })];
    const extra = { sales: [sale()], voids: two, movements: moves };
    expect(codes(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], extra))).toEqual(['void-duplicate']);
    const one = { sales: [sale()], voids: two.slice(0, 1), movements: moves };
    expect(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], one)).toEqual([]);
  });
  it('movement-unknown-battery', () => {
    const extra = { sales: [], voids: [], movements: [mov({ batteryId: 'ghost', delta: 5 })] };
    expect(codes(validateData([bat({ id: 'b1' })], [fit()], extra))).toEqual(['movement-unknown-battery']);
    expect(validateData([bat({ id: 'b1', quantity: 5 })], [fit()], { sales: [], voids: [], movements: [mov({ delta: 5 })] })).toEqual([]);
  });
  it('ledger-mismatch', () => {
    const moves = [mov({ delta: 10 }), mov({ id: 'm2', at: '2026-01-10T10:00:00Z', delta: -3, kind: 'adjust' })];
    expect(codes(validateData([bat({ id: 'b1', quantity: 5 })], [fit()], { sales: [], voids: [], movements: moves }))).toEqual(['ledger-mismatch']);
    expect(validateData([bat({ id: 'b1', quantity: 7 })], [fit()], { sales: [], voids: [], movements: moves })).toEqual([]);
  });
  it('negative-running-stock', () => {
    const moves = [mov({ delta: 5 }), mov({ id: 'm2', at: '2026-01-10T10:00:00Z', delta: -8, kind: 'adjust' }), mov({ id: 'm3', at: '2026-01-11T10:00:00Z', delta: 10, kind: 'receive' })];
    expect(codes(validateData([bat({ id: 'b1', quantity: 7 })], [fit()], { sales: [], voids: [], movements: moves }))).toEqual(['negative-running-stock']);
    const okMoves = [mov({ delta: 5 }), mov({ id: 'm2', at: '2026-01-10T10:00:00Z', delta: -3, kind: 'adjust' }), mov({ id: 'm3', at: '2026-01-11T10:00:00Z', delta: 10, kind: 'receive' })];
    expect(validateData([bat({ id: 'b1', quantity: 12 })], [fit()], { sales: [], voids: [], movements: okMoves })).toEqual([]);
  });
  it('sale-without-movements', () => {
    const extra = { sales: [sale()], voids: [], movements: [] };
    expect(codes(validateData([bat({ id: 'b1' })], [fit()], extra))).toEqual(['sale-without-movements']);
    const moves = [mov({ delta: 10 }), mov({ id: 'm2', delta: -2, kind: 'sale', saleId: 's1' })];
    const okExtra = { sales: [sale()], voids: [], movements: moves };
    expect(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], okExtra)).toEqual([]);
  });
  it('a quick sale (no customer) is valid; a customer without ID or IBAN is still a schema error', () => {
    const { customer: _c, ...quick } = sale();
    void _c;
    const moves = [mov({ delta: 10 }), mov({ id: 'm2', delta: -2, kind: 'sale', saleId: 's1' })];
    expect(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], { sales: [quick], voids: [], movements: moves })).toEqual([]);
    const half = sale({ customer: { firstName: 'A', lastName: 'B' } });
    expect(codes(validateData([bat({ id: 'b1', quantity: 8 })], [fit({ include: ['b1'] })], { sales: [half], voids: [], movements: moves }))).toContain('schema');
  });
  it('sale-total-mismatch follows core/inventory.ts saleTotal', () => {
    const lines = [{ batteryId: 'b1', name: 'b1', qty: 3, unitPrice: 99.99 }];
    const atCore = validateData([bat({ id: 'b1' })], [fit()], { sales: [sale({ lines, total: coreSaleTotal(lines, 10) })], voids: [], movements: [] });
    expect(codes(atCore)).toEqual(['sale-without-movements']);
    const aboveCore = validateData([bat({ id: 'b1' })], [fit()], { sales: [sale({ lines, total: coreSaleTotal(lines, 10) + 0.01 })], voids: [], movements: [] });
    expect(codes(aboveCore)).toEqual(['sale-total-mismatch', 'sale-without-movements']);
  });
});

describe('real data', () => {
  it('has zero errors', () => {
    const root = path.dirname(fileURLToPath(import.meta.url));
    const load = (n: string): unknown[] => JSON.parse(readFileSync(path.join(root, '..', 'data', n), 'utf8'));
    const issues = validateData(load('batteries.json'), load('fitments.json'));
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});
