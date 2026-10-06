import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAdminAuthForTests } from '@/server/admin-auth';
import { createJsonInventory } from '@/server/json-inventory';
import { createJsonRepository } from '@/server/json-repository';
import { JsonStore } from '@/server/json-store';
import { setRepositoryForTests } from '@/server/repository';
import { battery, makeDataDir } from '@/server/test-fixtures';
import { GET as exportCsv } from './export/[kind]/route';
import { GET as listBatteries } from './batteries/route';
import { GET as listSales, POST as postSale } from './sales/route';
import { POST as voidSale } from './sales/[id]/void/route';
import { POST as adjust } from './stock/adjust/route';
import { POST as receive } from './stock/receive/route';

const TOKEN = 'test-token-0123456789-abcdefghij';
const saleBody = (o: Record<string, unknown> = {}) => ({
  customer: { firstName: 'Nino', lastName: 'Beridze', idNumber: '01001012345', phone: '' },
  lines: [{ batteryId: 's60', qty: 2, unitPrice: 210 }], discount: 0, paymentMethod: 'cash', ...o,
});
const req = (url: string, init: { method?: string; body?: unknown; token?: string | null; ip?: string } = {}) =>
  new Request(`http://localhost${url}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.token === null ? {} : { Authorization: `Bearer ${init.token ?? TOKEN}` }),
      ...(init.ip ? { 'x-forwarded-for': init.ip } : {}),
    },
    ...(init.body === undefined ? {} : { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) }),
  });
const ctx = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as never;

let cat: ReturnType<typeof createJsonRepository>;
beforeEach(async () => {
  vi.stubEnv('ADMIN_API_TOKEN', TOKEN);
  resetAdminAuthForTests();
  const store = new JsonStore(await makeDataDir({ batteries: [battery({ id: 's60', quantity: 5, costPrice: 150 }), battery({ id: 'e70', quantity: 1 })] }));
  cat = createJsonRepository(store);
  setRepositoryForTests(cat, createJsonInventory(store));
});
afterEach(() => {
  vi.unstubAllEnvs();
  setRepositoryForTests(null);
});

describe('authentication fails closed', () => {
  const routes: [string, () => Promise<Response>][] = [
    ['GET sales', () => listSales(req('/api/admin/sales', { token: null }))],
    ['POST sales', () => postSale(req('/api/admin/sales', { method: 'POST', body: saleBody(), token: null }))],
    ['void', () => voidSale(req('/api/admin/sales/x/void', { method: 'POST', body: { reason: 'x' }, token: null }), ctx({ id: 'x' }))],
    ['receive', () => receive(req('/api/admin/stock/receive', { method: 'POST', body: {}, token: null }))],
    ['adjust', () => adjust(req('/api/admin/stock/adjust', { method: 'POST', body: {}, token: null }))],
    ['export', () => exportCsv(req('/api/admin/export/sales', { token: null }), ctx({ kind: 'sales' }))],
    ['batteries', () => listBatteries(req('/api/admin/batteries', { token: null }))],
  ];
  it.each(routes)('%s without a token → 401, no data, no caching', async (_n, call) => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
  it('wrong token → 401; correct token → 200', async () => {
    expect((await listSales(req('/api/admin/sales', { token: 'wrong' }))).status).toBe(401);
    expect((await listSales(req('/api/admin/sales'))).status).toBe(200);
  });
  it('no configured token, or a short one, disables the whole admin API (503)', async () => {
    vi.stubEnv('ADMIN_API_TOKEN', '');
    expect((await listSales(req('/api/admin/sales', { token: '' }))).status).toBe(503);
    vi.stubEnv('ADMIN_API_TOKEN', 'short');
    expect((await listSales(req('/api/admin/sales', { token: 'short' }))).status).toBe(503);
  });
  it('locks an address out after 10 wrong tokens, even for the right one, but not other addresses', async () => {
    for (let i = 0; i < 10; i++) expect((await listSales(req('/api/admin/sales', { token: 'bad', ip: '1.1.1.1' }))).status).toBe(401);
    const locked = await listSales(req('/api/admin/sales', { ip: '1.1.1.1' }));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await listSales(req('/api/admin/sales', { ip: '2.2.2.2' }))).status).toBe(200);
  });
  it('a successful login resets the failure counter', async () => {
    for (let i = 0; i < 9; i++) await listSales(req('/api/admin/sales', { token: 'bad', ip: '3.3.3.3' }));
    expect((await listSales(req('/api/admin/sales', { ip: '3.3.3.3' }))).status).toBe(200);
    for (let i = 0; i < 9; i++) expect((await listSales(req('/api/admin/sales', { token: 'bad', ip: '3.3.3.3' }))).status).toBe(401);
  });
});

describe('sales', () => {
  it('records a sale (201), normalises the form, and lowers the stock', async () => {
    const res = await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ customer: { firstName: ' Nino ', lastName: 'Beridze', iban: 'ge29 nb00 0000 0101 9049 17', idNumber: '', phone: '' }, discount: 10, note: '' }) }));
    expect(res.status).toBe(201);
    const { sale } = await res.json();
    expect(sale).toMatchObject({ total: 410, customer: { firstName: 'Nino', iban: 'GE29NB0000000101904917' }, lines: [{ name: 's60', unitCost: 150 }] });
    expect(sale.customer).not.toHaveProperty('idNumber');
    expect(sale).not.toHaveProperty('note');
    expect((await cat.getBattery('s60'))!.quantity).toBe(3);
  });
  it('rejects bad input with 400 naming fields but never echoing values', async () => {
    const res = await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ customer: { firstName: 'Nino', lastName: 'Beridze', idNumber: '12345SECRET' } }) }));
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('customer.idNumber');
    expect(text).not.toContain('SECRET');
  });
  it.each([
    ['not JSON', '{oops'],
    ['qty 0', saleBody({ lines: [{ batteryId: 's60', qty: 0, unitPrice: 1 }] })],
    ['fractional qty', saleBody({ lines: [{ batteryId: 's60', qty: 1.5, unitPrice: 1 }] })],
    ['negative price', saleBody({ lines: [{ batteryId: 's60', qty: 1, unitPrice: -1 }] })],
    ['no lines', saleBody({ lines: [] })],
    ['bad payment', saleBody({ paymentMethod: 'bitcoin' })],
    ['bad date', saleBody({ soldAt: 'yesterday' })],
    ['unknown extra field is ignored but missing customer is not', { lines: saleBody().lines, paymentMethod: 'cash' }],
  ])('400 for %s', async (_n, body) => {
    expect((await postSale(req('/api/admin/sales', { method: 'POST', body }))).status).toBe(400);
  });
  it('rejects an oversized body', async () => {
    expect((await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ note: 'x'.repeat(200_000) }) }))).status).toBe(400);
  });
  it('422 with details for business failures (no ID/IBAN, overselling), and changes nothing', async () => {
    const noId = await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ customer: { firstName: 'A', lastName: 'B' } }) }));
    expect(noId.status).toBe(422);
    expect((await noId.json()).details).toEqual(['customer needs an ID number or an IBAN']);
    const over = await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ lines: [{ batteryId: 's60', qty: 6, unitPrice: 1 }] }) }));
    expect(over.status).toBe(422);
    expect((await cat.getBattery('s60'))!.quantity).toBe(5);
  });
  it('lists sales by date range; date-only bounds are accepted', async () => {
    await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ soldAt: '2026-10-01T10:00:00.000Z' }) }));
    await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ soldAt: '2026-10-05T10:00:00.000Z' }) }));
    const body = await (await listSales(req('/api/admin/sales?from=2026-10-02&to=2026-10-06'))).json();
    expect(body.sales).toHaveLength(1);
    expect(body.sales[0].soldAt).toBe('2026-10-05T10:00:00.000Z');
    expect((await listSales(req('/api/admin/sales?from=garbage'))).status).toBe(400);
  });
  it('a date-only range means whole days in Tbilisi time: "to=today" includes sales made today, even just after local midnight', async () => {
    // 2026-10-06 00:30 in Tbilisi (UTC+4) is 2026-10-05 20:30 UTC
    await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ soldAt: '2026-10-05T20:30:00.000Z' }) }));
    const ids = async (q: string) => (await (await listSales(req(`/api/admin/sales?${q}`))).json()).sales.length;
    expect(await ids('from=2026-10-06&to=2026-10-06')).toBe(1);   // that Tbilisi day
    expect(await ids('from=2026-10-05&to=2026-10-05')).toBe(0);   // the previous Tbilisi day
    expect(await ids('from=2026-10-07')).toBe(0);
    expect(await ids('to=2026-10-05')).toBe(0);
  });
  it('voids a sale once: stock returns, second void is 409, unknown sale 404, empty reason 400', async () => {
    const { sale } = await (await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody() }))).json();
    const v = (reason: unknown, id = sale.id) => voidSale(req(`/api/admin/sales/${id}/void`, { method: 'POST', body: { reason } }), ctx({ id }));
    expect((await v('')).status).toBe(400);
    expect((await v('wrong battery')).status).toBe(201);
    expect((await cat.getBattery('s60'))!.quantity).toBe(5);
    expect((await v('again')).status).toBe(409);
    expect((await v('x', 'nope')).status).toBe(404);
  });
});

describe('battery list', () => {
  it('returns the full records with cost price and quantity, no caching', async () => {
    const res = await listBatteries(req('/api/admin/batteries'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const { batteries } = await res.json();
    expect(batteries.map((b: { id: string }) => b.id).sort()).toEqual(['e70', 's60']);
    expect(batteries.find((b: { id: string }) => b.id === 's60')).toMatchObject({ costPrice: 150, quantity: 5 });
  });
});

describe('stock', () => {
  it('receives and adjusts', async () => {
    const r = await receive(req('/api/admin/stock/receive', { method: 'POST', body: { batteryId: 's60', qty: 4, unitCost: 140, note: '' } }));
    expect(r.status).toBe(201);
    expect((await cat.getBattery('s60'))!.quantity).toBe(9);
    const a = await adjust(req('/api/admin/stock/adjust', { method: 'POST', body: { batteryId: 's60', countedQuantity: 8 } }));
    expect((await a.json()).movement).toMatchObject({ delta: -1, kind: 'adjust' });
  });
  it('maps errors: unknown battery 404, nothing to change 409, bad numbers 400', async () => {
    expect((await receive(req('/api/admin/stock/receive', { method: 'POST', body: { batteryId: 'zz', qty: 1 } }))).status).toBe(404);
    expect((await adjust(req('/api/admin/stock/adjust', { method: 'POST', body: { batteryId: 's60', countedQuantity: 5 } }))).status).toBe(409);
    expect((await receive(req('/api/admin/stock/receive', { method: 'POST', body: { batteryId: 's60', qty: 0 } }))).status).toBe(400);
    expect((await adjust(req('/api/admin/stock/adjust', { method: 'POST', body: { batteryId: 's60', countedQuantity: -1 } }))).status).toBe(400);
  });
});

describe('CSV export', () => {
  it('exports sales with the customer data, as a no-store attachment with BOM', async () => {
    await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody() }));
    const res = await exportCsv(req('/api/admin/export/sales'), ctx({ kind: 'sales' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment; filename="amper-sales-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM on the wire; res.text() would strip it
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('sale_id,date,status,first_name');
    expect(text).toContain('Nino,Beridze,01001012345');
  });
  it('exports the stock sheet with cost and the movements', async () => {
    const stock = await (await exportCsv(req('/api/admin/export/stock'), ctx({ kind: 'stock' }))).text();
    expect(stock).toContain('s60,s60,SMF,60,540,5,in,200,150,750');
    await receive(req('/api/admin/stock/receive', { method: 'POST', body: { batteryId: 's60', qty: 1 } }));
    expect(await (await exportCsv(req('/api/admin/export/movements'), ctx({ kind: 'movements' }))).text()).toContain(',s60,1,receive,');
  });
  it('neutralises a formula typed into a customer name', async () => {
    await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody({ customer: { firstName: '=HYPERLINK("http://evil")', lastName: 'X', idNumber: '01001012345' } }) }));
    const text = await (await exportCsv(req('/api/admin/export/sales'), ctx({ kind: 'sales' }))).text();
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });
  it('unknown kind → 404', async () => {
    expect((await exportCsv(req('/api/admin/export/users'), ctx({ kind: 'users' }))).status).toBe(404);
  });
});

describe('unexpected errors', () => {
  it('generic 500 that never contains the customer data', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setRepositoryForTests(cat, { recordSale: () => Promise.reject(new Error('boom /srv/data Nino')) } as never);
    const res = await postSale(req('/api/admin/sales', { method: 'POST', body: saleBody() }));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('{"error":"server_error"}');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
