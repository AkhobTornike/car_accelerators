import { getFirebaseAuth } from './firebase-client';

export type PaymentMethod = 'cash' | 'transfer' | 'card';
export type ExportKind = 'sales' | 'stock' | 'movements';
export type Segment = 'car' | 'truck' | 'moto' | 'deep';
export type Tech = 'SMF' | 'EFB' | 'AGM' | 'DEEP-CYCLE';
export type StockState = 'in' | 'order' | 'out';

export interface AdminBattery {
  id: string;
  name: string;
  brand: string;
  segment: Segment;
  tech: Tech;
  ah: number;
  cca: number;
  polarity: string;
  caseCode: string;
  dimsMm: { l: number; w: number; h: number };
  terminal?: string;
  holdDown?: string;
  warrantyMonths: number;
  price: number | null;
  costPrice?: number | null;
  stock: StockState;
  quantity?: number;
  oemCodes: string[];
  active: boolean;
  images?: string[];
}

export interface SaleCustomer {
  firstName: string;
  lastName: string;
  idNumber?: string;
  iban?: string;
  phone?: string;
}

export interface SaleLine {
  batteryId: string;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost?: number | null;
}

export interface Sale {
  id: string;
  soldAt: string;
  customer?: SaleCustomer; // absent for a quick sale
  lines: SaleLine[];
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  note?: string;
}

export interface SaleVoid {
  id: string;
  saleId: string;
  at: string;
  reason: string;
}

export interface NewSaleInput {
  customer?: SaleCustomer;
  lines: { batteryId: string; qty: number; unitPrice: number }[];
  discount?: number;
  paymentMethod?: PaymentMethod;
  note?: string;
}

export type TokenGetter = () => Promise<string>;

export type FailureKind = 'forbidden' | 'rate-limited' | 'invalid' | 'server';

export class AdminApiError extends Error {
  kind: FailureKind;
  status: number;
  code: string;
  details: string[];
  constructor(kind: FailureKind, status: number, code: string, details: string[] = []) {
    super(`${kind}: ${code}${details.length ? ` (${details.join('; ')})` : ''}`);
    this.name = 'AdminApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const defaultToken: TokenGetter = async () => (await getFirebaseAuth().currentUser?.getIdToken()) ?? '';

async function toError(res: Response): Promise<AdminApiError> {
  let code = 'server_error';
  let details: string[] = [];
  try {
    const body = (await res.json()) as { error?: unknown; details?: unknown };
    if (typeof body.error === 'string') code = body.error;
    if (Array.isArray(body.details)) details = body.details.filter((d): d is string => typeof d === 'string');
  } catch {
    code = `http_${res.status}`;
  }
  if (res.status === 401) return new AdminApiError('forbidden', 401, code, details);
  if (res.status === 429) return new AdminApiError('rate-limited', 429, code, details);
  if (res.status === 400 || res.status === 422) return new AdminApiError('invalid', res.status, code, details);
  return new AdminApiError('server', res.status, code, details);
}

export async function adminFetch(path: string, init?: RequestInit, getToken: TokenGetter = defaultToken): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = await getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new AdminApiError('server', 0, 'network_error');
  }
  if (!res.ok) throw await toError(res);
  return res;
}

function query(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function getJson<T>(path: string, getToken?: TokenGetter): Promise<T> {
  return (await (await adminFetch(path, undefined, getToken)).json()) as T;
}

async function postJson<T>(path: string, body: unknown, getToken?: TokenGetter): Promise<T> {
  return (await (
    await adminFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, getToken)
  ).json()) as T;
}

async function patchJson<T>(path: string, body: unknown, getToken?: TokenGetter): Promise<T> {
  return (await (
    await adminFetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, getToken)
  ).json()) as T;
}

async function deleteJson<T>(path: string, body: unknown, getToken?: TokenGetter): Promise<T> {
  return (await (
    await adminFetch(path, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, getToken)
  ).json()) as T;
}

async function deleteNoBody<T>(path: string, getToken?: TokenGetter): Promise<T> {
  return (await (await adminFetch(path, { method: 'DELETE' }, getToken)).json()) as T;
}

export interface NewProductInput {
  brand?: string;
  name: string;
  segment: Segment;
  tech: Tech;
  ah: number;
  cca: number;
  polarity: 'L+' | 'R+';
  caseCode: string;
  dimsMm: { l: number; w: number; h: number };
  warrantyMonths: number;
  price: number | null;
  costPrice?: number | null;
  stock?: StockState;
  oemCodes?: string[];
  active?: boolean;
  quantity?: number;
}

export type ProductPatch = Partial<Omit<NewProductInput, 'quantity'>>;

export function createProduct(body: NewProductInput, getToken?: TokenGetter): Promise<{ battery: AdminBattery }> {
  return postJson('/api/admin/batteries', body, getToken);
}

export function patchProduct(id: string, body: ProductPatch, getToken?: TokenGetter): Promise<{ battery: AdminBattery }> {
  return patchJson(`/api/admin/batteries/${encodeURIComponent(id)}`, body, getToken);
}

export function deleteProduct(id: string, getToken?: TokenGetter): Promise<{ removedFromFitments: number }> {
  return deleteNoBody(`/api/admin/batteries/${encodeURIComponent(id)}`, getToken);
}

export function uploadImage(batteryId: string, file: Blob, getToken?: TokenGetter): Promise<{ url: string; images: string[] }> {
  const form = new FormData();
  form.append('batteryId', batteryId);
  form.append('file', file);
  return adminFetch('/api/admin/images', { method: 'POST', body: form }, getToken).then(async (res) => (await res.json()) as {
    url: string;
    images: string[];
  });
}

export function deleteImage(batteryId: string, url: string, getToken?: TokenGetter): Promise<{ images: string[] }> {
  return deleteJson('/api/admin/images', { batteryId, url }, getToken);
}

export function listBatteries(getToken?: TokenGetter): Promise<{ batteries: AdminBattery[] }> {
  return getJson('/api/admin/batteries', getToken);
}

export function listSales(from?: string, to?: string, getToken?: TokenGetter): Promise<{ sales: Sale[]; voids: SaleVoid[] }> {
  return getJson(`/api/admin/sales${query({ from, to })}`, getToken);
}

export function createSale(body: NewSaleInput, getToken?: TokenGetter): Promise<{ sale: Sale }> {
  return postJson('/api/admin/sales', body, getToken);
}

export function voidSale(id: string, reason: string, getToken?: TokenGetter): Promise<{ void: SaleVoid }> {
  return postJson(`/api/admin/sales/${encodeURIComponent(id)}/void`, { reason }, getToken);
}

export function receiveStock(
  body: { batteryId: string; qty: number; unitCost?: number | null; note?: string },
  getToken?: TokenGetter,
): Promise<{ movement: { id: string } }> {
  return postJson('/api/admin/stock/receive', body, getToken);
}

export function adjustStock(
  body: { batteryId: string; countedQuantity: number; note?: string },
  getToken?: TokenGetter,
): Promise<{ movement: { id: string } }> {
  return postJson('/api/admin/stock/adjust', body, getToken);
}

export function parseDisposition(header: string | null): string | null {
  const m = header?.match(/filename="([^"]+)"/);
  return m ? m[1] : null;
}

export async function downloadExport(
  kind: ExportKind,
  from?: string,
  to?: string,
  getToken?: TokenGetter,
): Promise<{ blob: Blob; filename: string }> {
  const res = await adminFetch(`/api/admin/export/${kind}${query({ from, to })}`, undefined, getToken);
  const blob = await res.blob();
  return { blob, filename: parseDisposition(res.headers.get('Content-Disposition')) ?? `amper-${kind}.csv` };
}

export type IdDocument = { kind: 'iban'; value: string } | { kind: 'idNumber'; value: string } | { kind: 'none' };

export function detectIdDocument(raw: string): IdDocument {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (!compact) return { kind: 'none' };
  if (/^GE\d{2}[A-Z]{2}\d{16}$/.test(compact)) return { kind: 'iban', value: compact };
  if (/^(\d{9}|\d{11})$/.test(compact)) return { kind: 'idNumber', value: compact };
  return { kind: 'none' };
}

export function formatMoney(n: number): string {
  const fixed = Math.abs(n).toFixed(2);
  const [int, frac] = fixed.split('.');
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${frac} ₾`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcSaleTotal(lines: { qty: number; unitPrice: number }[], discount: number): number {
  return round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) - discount);
}

export function lineTotal(qty: number, unitPrice: number): number {
  return round2(qty * unitPrice);
}

export interface QuickLineInput {
  batteryId: string;
  qty: number;
  unitPrice: number;
}

export function quickSaleBody(lines: QuickLineInput[]): { lines: QuickLineInput[] } {
  return { lines: lines.map((l) => ({ batteryId: l.batteryId, qty: l.qty, unitPrice: l.unitPrice })) };
}

export type QuickLineError = { index: number; code: 'empty' | 'qty' | 'stock' | 'price' };

export function validateQuickLines(
  lines: QuickLineInput[],
  stockOf: (batteryId: string) => number | undefined,
): QuickLineError[] {
  if (lines.length === 0) return [{ index: -1, code: 'empty' }];
  const errors: QuickLineError[] = [];
  lines.forEach((l, index) => {
    if (!Number.isInteger(l.qty) || l.qty < 1) {
      errors.push({ index, code: 'qty' });
      return;
    }
    const stock = stockOf(l.batteryId);
    if (stock !== undefined && l.qty > stock) errors.push({ index, code: 'stock' });
    if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) errors.push({ index, code: 'price' });
  });
  return errors;
}

export function specLine(b: Pick<AdminBattery, 'polarity' | 'caseCode' | 'ah' | 'cca'>): string {
  return `${b.polarity}, ${b.caseCode}, ${b.ah}Ah, ${b.cca}A`;
}

export interface ProductFormValues {
  brand: string;
  name: string;
  segment: Segment;
  tech: Tech;
  ah: string;
  cca: string;
  polarity: 'L+' | 'R+' | '';
  caseCode: string;
  dimL: string;
  dimW: string;
  dimH: string;
  warrantyMonths: string;
  price: string;
  costPrice: string;
  quantity: string;
  oemCodes: string;
}

export type ProductFormError =
  | 'brand'
  | 'name'
  | 'ah'
  | 'cca'
  | 'polarity'
  | 'caseCode'
  | 'dims'
  | 'warranty'
  | 'price'
  | 'costPrice'
  | 'quantity';

const positive = (s: string) => s.trim() !== '' && Number.isFinite(Number(s)) && Number(s) > 0;

export function validateProductForm(v: ProductFormValues, opts: { quantity: boolean }): ProductFormError[] {
  const errors: ProductFormError[] = [];
  if (!v.brand.trim()) errors.push('brand');
  if (!v.name.trim()) errors.push('name');
  if (!positive(v.ah)) errors.push('ah');
  if (!positive(v.cca)) errors.push('cca');
  if (v.polarity !== 'L+' && v.polarity !== 'R+') errors.push('polarity');
  if (!/^[A-Z0-9-]{1,20}$/.test(v.caseCode.trim().toUpperCase())) errors.push('caseCode');
  if (!positive(v.dimL) || !positive(v.dimW) || !positive(v.dimH)) errors.push('dims');
  if (v.warrantyMonths.trim() === '' || !Number.isInteger(Number(v.warrantyMonths)) || Number(v.warrantyMonths) < 0) {
    errors.push('warranty');
  }
  if (v.price.trim() !== '' && (!Number.isFinite(Number(v.price)) || Number(v.price) < 0)) errors.push('price');
  if (v.costPrice.trim() !== '' && (!Number.isFinite(Number(v.costPrice)) || Number(v.costPrice) < 0)) errors.push('costPrice');
  if (opts.quantity && (v.quantity.trim() === '' || !Number.isInteger(Number(v.quantity)) || Number(v.quantity) < 0)) {
    errors.push('quantity');
  }
  return errors;
}

export function parseOemCodes(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
}

export function formToNewProduct(v: ProductFormValues): NewProductInput {
  return {
    ...(v.brand.trim() ? { brand: v.brand.trim() } : {}),
    name: v.name.trim(),
    segment: v.segment,
    tech: v.tech,
    ah: Number(v.ah),
    cca: Number(v.cca),
    polarity: v.polarity as 'L+' | 'R+',
    caseCode: v.caseCode.trim().toUpperCase(),
    dimsMm: { l: Number(v.dimL), w: Number(v.dimW), h: Number(v.dimH) },
    warrantyMonths: Number(v.warrantyMonths),
    price: v.price.trim() === '' ? null : Number(v.price),
    ...(v.costPrice.trim() === '' ? {} : { costPrice: Number(v.costPrice) }),
    oemCodes: parseOemCodes(v.oemCodes),
    ...(v.quantity.trim() === '' ? {} : { quantity: Number(v.quantity) }),
  };
}

const sameCodes = (a: string[], b: string[]) => a.length === b.length && a.every((c, i) => c === b[i]);

export function changedFields(current: AdminBattery, v: ProductFormValues): ProductPatch {
  const next = formToNewProduct(v);
  const patch: ProductPatch = {};
  if (next.brand !== undefined && next.brand !== current.brand) patch.brand = next.brand;
  if (next.name !== current.name) patch.name = next.name;
  if (next.segment !== current.segment) patch.segment = next.segment;
  if (next.tech !== current.tech) patch.tech = next.tech;
  if (next.ah !== current.ah) patch.ah = next.ah;
  if (next.cca !== current.cca) patch.cca = next.cca;
  if (next.polarity !== current.polarity) patch.polarity = next.polarity;
  if (next.caseCode !== current.caseCode) patch.caseCode = next.caseCode;
  if (next.dimsMm.l !== current.dimsMm.l || next.dimsMm.w !== current.dimsMm.w || next.dimsMm.h !== current.dimsMm.h) {
    patch.dimsMm = next.dimsMm;
  }
  if (next.warrantyMonths !== current.warrantyMonths) patch.warrantyMonths = next.warrantyMonths;
  if (next.price !== current.price) patch.price = next.price;
  if ((next.costPrice ?? null) !== (current.costPrice ?? null)) patch.costPrice = next.costPrice ?? null;
  if (!sameCodes(next.oemCodes ?? [], current.oemCodes)) patch.oemCodes = next.oemCodes;
  return patch;
}
