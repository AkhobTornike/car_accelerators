import { describe, expect, it } from 'vitest';
import { movementsToCsv, salesToCsv, stockToCsv, toCsv } from './csv.ts';
import type { Battery, Sale } from './types.ts';

const rows = (csv: string) => csv.replace(/^\uFEFF/, '').split('\r\n').slice(0, -1);

describe('toCsv', () => {
  const cols = [{ header: 'a', value: (r: { a: string | number | null | undefined }) => r.a }];
  it('starts with a BOM, uses CRLF and ends with a newline', () => {
    const out = toCsv([{ a: 1 }], cols);
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(out.endsWith('\r\n')).toBe(true);
    expect(rows(out)).toEqual(['a', '1']);
  });
  it('quotes commas, quotes and newlines; leaves Georgian text alone', () => {
    expect(rows(toCsv([{ a: 'x,y' }, { a: 'say "hi"' }, { a: 'two\nlines' }, { a: 'გიორგი' }], cols)).slice(1)).toEqual(['"x,y"', '"say ""hi"""', '"two\nlines"', 'გიორგი']);
  });
  it('neutralises spreadsheet formulas in strings but not negative numbers', () => {
    expect(rows(toCsv([{ a: '=HYPERLINK("x")' }, { a: '+1+1' }, { a: '-2' }, { a: '@SUM(A1)' }, { a: -5 }], cols)).slice(1))
      .toEqual(['"\'=HYPERLINK(""x"")"', "'+1+1", "'-2", "'@SUM(A1)", '-5']);
  });
  it('renders null and undefined as empty cells', () => {
    expect(rows(toCsv([{ a: null }, { a: undefined }], cols))).toEqual(['a', '', '']);
  });
});

describe('salesToCsv', () => {
  const sale: Sale = {
    id: 's1', soldAt: '2026-10-03T10:00:00.000Z', customer: { firstName: 'Nino', lastName: 'Beridze', iban: 'GE29NB0000000101904917' },
    lines: [{ batteryId: 'a', name: 'AMPER S60', qty: 2, unitPrice: 215 }, { batteryId: 'b', name: 'AMPER E70', qty: 1, unitPrice: 315 }],
    discount: 30, total: 715, paymentMethod: 'transfer',
  };
  it('writes one row per line, sale-level amounts only on the first line', () => {
    const r = rows(salesToCsv([sale], []));
    expect(r).toHaveLength(3);
    expect(r[1]).toContain('s1,2026-10-03T10:00:00.000Z,completed,Nino,Beridze,,GE29NB0000000101904917');
    expect(r[1]).toMatch(/,2,215,430,30,715,transfer/);
    expect(r[2]).toMatch(/,1,315,315,,,transfer/);
  });
  it('keeps voided sales, marked with the reason', () => {
    const r = rows(salesToCsv([sale], [{ id: 'v', saleId: 's1', at: '2026-10-04T00:00:00.000Z', reason: 'returned' }]));
    expect(r[1]).toContain(',voided,');
    expect(r[1].endsWith(',returned')).toBe(true);
  });
});

describe('stock and movement exports', () => {
  const b = { id: 'a', name: 'A', tech: 'SMF', ah: 60, cca: 540, quantity: 4, stock: 'in', price: 200, costPrice: 150 } as Battery;
  it('stock sheet includes cost and value at cost; blank when unknown', () => {
    const r = rows(stockToCsv([b, { ...b, id: 'u', quantity: undefined, costPrice: null }]));
    expect(r[1]).toBe('a,A,SMF,60,540,4,in,200,150,600');
    expect(r[2]).toBe('u,A,SMF,60,540,,in,200,,');
  });
  it('movement sheet', () => {
    const r = rows(movementsToCsv([{ id: 'm1', at: '2026-10-03T10:00:00.000Z', batteryId: 'a', delta: -2, kind: 'sale', saleId: 's1' }]));
    expect(r[1]).toBe('m1,2026-10-03T10:00:00.000Z,a,-2,sale,s1,,');
  });
});
