import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdminApiError,
  adjustStock,
  calcSaleTotal,
  changedFields,
  createProduct,
  createSale,
  deleteImage,
  deleteProduct,
  detectIdDocument,
  downloadExport,
  formatMoney,
  formToNewProduct,
  listBatteries,
  listSales,
  lineTotal,
  parseDisposition,
  parseOemCodes,
  patchProduct,
  quickSaleBody,
  receiveStock,
  uploadImage,
  validateProductForm,
  validateQuickLines,
  voidSale,
  type AdminBattery,
  type ProductFormValues,
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
  it('detectIdDocument', () => {    expect(detectIdDocument('ge12 ab3456789012345678')).toEqual({ kind: 'iban', value: 'GE12AB3456789012345678' });
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

const productForm = (o: Partial<ProductFormValues> = {}): ProductFormValues => ({
  brand: 'AMPER',
  name: 'S60',
  segment: 'car',
  tech: 'SMF',
  ah: '60',
  cca: '540',
  polarity: 'R+',
  caseCode: 'L2',
  dimL: '242',
  dimW: '175',
  dimH: '190',
  warrantyMonths: '24',
  price: '200',
  costPrice: '',
  quantity: '0',
  oemCodes: ' 560 409 054\n\n0 092 S50 080\n',
  ...o,
});

const storedBattery = (o: Partial<AdminBattery> = {}): AdminBattery => ({
  id: 's60',
  brand: 'AMPER',
  name: 'S60',
  segment: 'car',
  tech: 'SMF',
  ah: 60,
  cca: 540,
  polarity: 'R+',
  caseCode: 'L2',
  dimsMm: { l: 242, w: 175, h: 190 },
  warrantyMonths: 24,
  price: 200,
  stock: 'in',
  quantity: 5,
  oemCodes: ['560 409 054', '0 092 S50 080'],
  active: true,
  ...o,
});

describe('product endpoints', () => {
  it('createProduct posts to /api/admin/batteries and parses 201', async () => {
    const seen: { url: string; method?: string; body: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        seen.push({ url, method: init?.method, body: String(init?.body) });
        return { ok: true, status: 201, headers: new Headers(), json: async () => ({ battery: { id: 's60' } }) } as Response;
      }),
    );
    const { battery } = await createProduct(
      { name: 'S60', segment: 'car', tech: 'SMF', ah: 60, cca: 540, polarity: 'R+', caseCode: 'L2', dimsMm: { l: 242, w: 175, h: 190 }, warrantyMonths: 24, price: 200 },
      token,
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('/api/admin/batteries');
    expect(seen[0].method).toBe('POST');
    expect(battery.id).toBe('s60');
  });
  it('patchProduct PATCHes /api/admin/batteries/<id> with only the given fields', async () => {
    const seen: { url: string; method?: string; body: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        seen.push({ url, method: init?.method, body: String(init?.body) });
        return ok({ battery: { id: 's 60' } });
      }),
    );
    await patchProduct('s 60', { price: 210 }, token);
    expect(seen[0].url).toBe('/api/admin/batteries/s%2060');
    expect(seen[0].method).toBe('PATCH');
    expect(JSON.parse(seen[0].body)).toEqual({ price: 210 });
  });
  it('deleteProduct DELETEs and parses removedFromFitments', async () => {
    const seen: { url: string; method?: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        seen.push({ url, method: init?.method });
        return ok({ removedFromFitments: 3 });
      }),
    );
    await expect(deleteProduct('s60', token)).resolves.toEqual({ removedFromFitments: 3 });
    expect(seen[0]).toEqual({ url: '/api/admin/batteries/s60', method: 'DELETE' });
  });
  it('400 carries details, 409 conflict and has_history are distinguishable, 404 keeps its code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(400, { error: 'invalid_input', details: ['name: bad'] })));
    const bad = (await createProduct({} as never, token).catch((e) => e)) as AdminApiError;
    expect(bad.kind).toBe('invalid');
    expect(bad.details).toEqual(['name: bad']);
    vi.stubGlobal('fetch', vi.fn(async () => fail(409, { error: 'conflict', details: [] })));
    const conflict = (await createProduct({} as never, token).catch((e) => e)) as AdminApiError;
    expect(conflict.code).toBe('conflict');
    vi.stubGlobal('fetch', vi.fn(async () => fail(409, { error: 'has_history', details: [] })));
    const history = (await deleteProduct('s60', token).catch((e) => e)) as AdminApiError;
    expect(history.code).toBe('has_history');
    expect(history.code).not.toBe(conflict.code);
    vi.stubGlobal('fetch', vi.fn(async () => fail(404, { error: 'not_found', details: [] })));
    const missing = (await deleteProduct('nope', token).catch((e) => e)) as AdminApiError;
    expect(missing.status).toBe(404);
    expect(missing.code).toBe('not_found');
  });
});

describe('product form helpers', () => {
  it('formToNewProduct maps dims, empty price to null, OEM textarea to an array', () => {
    expect(formToNewProduct(productForm({ brand: '  ', price: '', costPrice: '150', caseCode: 'l2', quantity: '' }))).toEqual({
      name: 'S60',
      segment: 'car',
      tech: 'SMF',
      ah: 60,
      cca: 540,
      polarity: 'R+',
      caseCode: 'L2',
      dimsMm: { l: 242, w: 175, h: 190 },
      warrantyMonths: 24,
      price: null,
      costPrice: 150,
      oemCodes: ['560 409 054', '0 092 S50 080'],
    });
  });
  it('parseOemCodes trims and drops empty lines', () => {
    expect(parseOemCodes(' a \n\nb\n ')).toEqual(['a', 'b']);
    expect(parseOemCodes('')).toEqual([]);
  });
  it('changedFields sends only what changed', () => {
    expect(changedFields(storedBattery(), productForm({ quantity: '99' }))).toEqual({});
    expect(changedFields(storedBattery(), productForm({ price: '210', name: 'S60+' }))).toEqual({ price: 210, name: 'S60+' });
    expect(changedFields(storedBattery(), productForm({ costPrice: '' }))).toEqual({});
    expect(changedFields(storedBattery({ costPrice: null }), productForm({ costPrice: '' }))).toEqual({});
    expect(changedFields(storedBattery(), productForm({ costPrice: '100' }))).toEqual({ costPrice: 100 });
    expect(changedFields(storedBattery(), productForm({ oemCodes: '560 409 054\n0 092 S50 080' }))).toEqual({});
  });
  it('validateProductForm flags each broken rule and passes a good form', () => {
    expect(validateProductForm(productForm(), { quantity: true })).toEqual([]);
    expect(validateProductForm(productForm({ name: '  ' }), { quantity: true })).toEqual(['name']);
    expect(validateProductForm(productForm({ ah: '-5' }), { quantity: true })).toEqual(['ah']);
    expect(validateProductForm(productForm({ polarity: '' }), { quantity: true })).toEqual(['polarity']);
    expect(validateProductForm(productForm({ caseCode: 'L 2!' }), { quantity: true })).toEqual(['caseCode']);
    expect(validateProductForm(productForm({ dimH: '0' }), { quantity: true })).toEqual(['dims']);
    expect(validateProductForm(productForm({ price: 'abc' }), { quantity: true })).toEqual(['price']);
    expect(validateProductForm(productForm({ quantity: '2.5' }), { quantity: true })).toEqual(['quantity']);
    expect(validateProductForm(productForm({ quantity: '2.5' }), { quantity: false })).toEqual([]);
  });
});

describe('quick sale helpers', () => {
  it('lineTotal rounds qty x price to 2 decimals', () => {
    expect(lineTotal(3, 215)).toBe(645);
    expect(lineTotal(1, 199.99)).toBe(199.99);
    expect(lineTotal(3, 10.333)).toBe(31);
  });
  it('quickSaleBody has lines but no customer or paymentMethod keys', () => {
    const body = quickSaleBody([{ batteryId: 'b1', qty: 2, unitPrice: 100 }]);
    expect(body).toEqual({ lines: [{ batteryId: 'b1', qty: 2, unitPrice: 100 }] });
    expect('customer' in body).toBe(false);
    expect('paymentMethod' in body).toBe(false);
  });
  it('validateQuickLines flags empty, qty, stock and price problems', () => {
    const stockOf = (id: string) => (id === 'b1' ? 5 : undefined);
    expect(validateQuickLines([], stockOf)).toEqual([{ index: -1, code: 'empty' }]);
    expect(validateQuickLines([{ batteryId: 'b1', qty: 2, unitPrice: 100 }], stockOf)).toEqual([]);
    expect(validateQuickLines([{ batteryId: 'b1', qty: 0, unitPrice: 100 }], stockOf)).toEqual([{ index: 0, code: 'qty' }]);
    expect(validateQuickLines([{ batteryId: 'b1', qty: 6, unitPrice: 100 }], stockOf)).toEqual([{ index: 0, code: 'stock' }]);
    expect(validateQuickLines([{ batteryId: 'b9', qty: 6, unitPrice: 100 }], stockOf)).toEqual([]);
    expect(validateQuickLines([{ batteryId: 'b1', qty: 2, unitPrice: -1 }], stockOf)).toEqual([{ index: 0, code: 'price' }]);
  });
  it('createSale without customer sends a body without that key', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        seen.push(String(init?.body));
        return ok({ sale: { id: 's1' } });
      }),
    );
    await createSale({ lines: [{ batteryId: 'b1', qty: 1, unitPrice: 100 }] }, token);
    const sent = JSON.parse(seen[0]);
    expect('customer' in sent).toBe(false);
    expect('paymentMethod' in sent).toBe(false);
    expect(sent.lines).toEqual([{ batteryId: 'b1', qty: 1, unitPrice: 100 }]);
  });
});

describe('product images', () => {
  it('uploadImage posts FormData without a Content-Type header', async () => {
    const seen: { url: string; method?: string; contentType: string | null; form: FormData | null }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        seen.push({
          url,
          method: init?.method,
          contentType: headers.get('Content-Type'),
          form: init?.body instanceof FormData ? init.body : null,
        });
        return ok({ url: 'https://x/img.webp', images: ['https://x/img.webp'] });
      }),
    );
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' });
    const res = await uploadImage('b1', file, token);
    expect(res).toEqual({ url: 'https://x/img.webp', images: ['https://x/img.webp'] });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('/api/admin/images');
    expect(seen[0].method).toBe('POST');
    expect(seen[0].contentType).toBeNull();
    expect(seen[0].form?.get('batteryId')).toBe('b1');
    expect(seen[0].form?.get('file')).toBe(file);
  });
  it('deleteImage sends DELETE with a JSON body and parses images', async () => {
    const seen: { url: string; method?: string; body: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        seen.push({ url, method: init?.method, body: String(init?.body) });
        return ok({ images: [] });
      }),
    );
    await expect(deleteImage('b1', 'https://x/img.webp', token)).resolves.toEqual({ images: [] });
    expect(seen[0].url).toBe('/api/admin/images');
    expect(seen[0].method).toBe('DELETE');
    expect(JSON.parse(seen[0].body)).toEqual({ batteryId: 'b1', url: 'https://x/img.webp' });
  });
});
