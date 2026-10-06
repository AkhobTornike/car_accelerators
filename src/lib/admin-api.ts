import { getFirebaseAuth } from './firebase-client';

export type PaymentMethod = 'cash' | 'transfer' | 'card';
export type ExportKind = 'sales' | 'stock' | 'movements';

export interface AdminBattery {
  id: string;
  name: string;
  brand: string;
  tech: string;
  ah: number;
  cca: number;
  polarity: string;
  caseCode: string;
  warrantyMonths: number;
  price: number | null;
  costPrice?: number | null;
  stock: 'in' | 'order' | 'out';
  quantity?: number;
  oemCodes: string[];
  active: boolean;
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
  customer: SaleCustomer;
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
  customer: SaleCustomer;
  lines: { batteryId: string; qty: number; unitPrice: number }[];
  discount: number;
  paymentMethod: PaymentMethod;
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

export function specLine(b: Pick<AdminBattery, 'polarity' | 'caseCode' | 'ah' | 'cca'>): string {
  return `${b.polarity}, ${b.caseCode}, ${b.ah}Ah, ${b.cca}A`;
}
