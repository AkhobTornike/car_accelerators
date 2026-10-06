import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdminApiError,
  adjustStock,
  calcSaleTotal,
  createSale,
  detectIdDocument,
  downloadExport,
  formatMoney,
  listBatteries,
  listSales,
  parseDisposition,
  receiveStock,
  voidSale,
} from './admin-api';

const token = async () => 'test-token';

const ok = (body: unknown, headers: Record<string, string> = {}) =>
  ({ ok: true, status: 200, headers: new Headers(headers), json: async () => body }) as Response;
const fail = (status: number, body: unknown = {}) => ({ ok: false, status, headers: new Headers(), json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('auth header and query strings', () => {
  it('adds the Bearer header', async () => {
    const seen: Record<string, string> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        new Headers(init?.headers).forEach((v, k) => {
          seen[k] = v;
        });
        return ok({ batteries: [] });
      }),
    );
    await listBatteries(token);
    expect(seen.authorization).toBe('Bearer test-token');
  });
  it('builds from/to query strings', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return ok({ sales: [], voids: [] });
      }),
    );
    await listSales('2026-09-01', '2026-10-01', token);
    expect(seen[0]).toBe('/api/admin/sales?from=2026-09-01&to=2026-10-01');
    await listSales(undefined, undefined, token);
    expect(seen[1]).toBe('/api/admin/sales');
  });
  it('posts JSON bodies', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        seen.push(String(init?.body));
        return ok({ sale: { id: 's1' } });
      }),
    );
    await createSale({ customer: { firstName: 'ა', lastName: 'ბ' }, lines: [], discount: 0, paymentMethod: 'cash' }, token);
    expect(JSON.parse(seen[0]).paymentMethod).toBe('cash');
  });
});

describe('error mapping', () => {
  it.each([
    [401, 'forbidden'],
    [429, 'rate-limited'],
    [422, 'invalid'],
    [400, 'invalid'],
    [500, 'server'],
  ])('%i maps to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(status, { error: 'x', details: ['a.b: bad'] })));
    const err = (await listBatteries(token).catch((e) => e)) as AdminApiError;
    expect(err).toBeInstanceOf(AdminApiError);
    expect(err.kind).toBe(kind);
    expect(err.status).toBe(status);
  });
  it('carries 422 details strings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(422, { error: 'invalid_sale', details: ['lines.0.qty: bad'] })));
    const err = (await createSale({ customer: { firstName: 'ა', lastName: 'ბ' }, lines: [], discount: 0, paymentMethod: 'cash' }, token).catch((e) => e)) as AdminApiError;
    expect(err.details).toEqual(['lines.0.qty: bad']);
  });
  it('network failure maps to server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const err = (await listSales('2026-09-01', undefined, token).catch((e) => e)) as AdminApiError;
    expect(err.kind).toBe('server');
  });
  it('void and stock endpoints post to the right paths', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return ok({});
      }),
    );
    await voidSale('s-9', 'reason', token);
    await receiveStock({ batteryId: 'b1', qty: 2 }, token);
    await adjustStock({ batteryId: 'b1', countedQuantity: 5 }, token);
    expect(seen).toEqual(['/api/admin/sales/s-9/void', '/api/admin/stock/receive', '/api/admin/stock/adjust']);
  });
});

describe('export download', () => {
  it('parses the filename from Content-Disposition', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Disposition': 'attachment; filename="amper-sales-2026-10-04.csv"' }),
        blob: async () => new Blob(['a,b'], { type: 'text/csv' }),
      })) as unknown as Response,
    );
    const { blob, filename } = await downloadExport('sales', '2026-09-01', undefined, token);
    expect(filename).toBe('amper-sales-2026-10-04.csv');
    expect(await blob.text()).toBe('a,b');
  });
  it('falls back when the header is missing', () => {
    expect(parseDisposition(null)).toBeNull();
    expect(parseDisposition('attachment')).toBeNull();
  });
});

describe('pure helpers', () => {
  it('detectIdDocument', () => {
    expect(detectIdDocument('ge12 ab3456789012345678')).toEqual({ kind: 'iban', value: 'GE12AB3456789012345678' });
    expect(detectIdDocument('123456789')).toEqual({ kind: 'idNumber', value: '123456789' });
    expect(detectIdDocument('12345678901')).toEqual({ kind: 'idNumber', value: '12345678901' });
    expect(detectIdDocument('12345').kind).toBe('none');
    expect(detectIdDocument('   ').kind).toBe('none');
  });
  it('formatMoney', () => {
    expect(formatMoney(1234.5)).toBe('1 234.50 ₾');
    expect(formatMoney(0)).toBe('0.00 ₾');
    expect(formatMoney(1000000)).toBe('1 000 000.00 ₾');
  });
  it('calcSaleTotal', () => {
    expect(calcSaleTotal([{ qty: 2, unitPrice: 100 }, { qty: 1, unitPrice: 50 }], 10)).toBe(240);
    expect(calcSaleTotal([], 0)).toBe(0);
  });
});
