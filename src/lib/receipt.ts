import type { AdminBattery, PaymentMethod, Sale } from './admin-api';
import type { ShopProfile } from '@/server/shop-profile';

export const VAT_RATE = 0.18;

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptCustomer {
  name: string;
  idKind: 'idNumber' | 'iban' | null;
  idValue: string | null;
}

export interface WarrantyItem {
  name: string;
  ah: number | null;
  cca: number | null;
  warrantyMonths: number | null;
  endDate: string | null;
}

export interface ReceiptModel {
  number: string;
  dateIso: string;
  dateDisplay: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  vatPayer: boolean;
  net: number;
  vat: number;
  paymentMethod: PaymentMethod;
  customer: ReceiptCustomer | null;
  warranty: WarrantyItem[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Fixed dd.mm.yyyy [hh:mm] in Tbilisi time. Deliberately not a locale format: browsers without Georgian data
// print English month names ("Oct 7, 2026") on a Georgian document.
const tbilisiDay = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tbilisi', day: '2-digit', month: '2-digit', year: 'numeric' });
const tbilisiDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tbilisi', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function formatTbilisiDate(iso: string): string {
  return tbilisiDay.format(new Date(iso)).replaceAll('/', '.');
}

export function formatTbilisiDateTime(iso: string): string {
  return tbilisiDateTime.format(new Date(iso)).replace(',', '').replaceAll('/', '.');
}

export function documentNumber(prefix: string, saleId: string): string {
  const rest = saleId.startsWith('s-') ? saleId.slice(2) : saleId;
  return `${prefix}${rest}`;
}

export function warrantyEndDate(soldAtIso: string, months: number): string {
  const start = new Date(soldAtIso);
  const day = start.getUTCDate();
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return tbilisiDay.format(end);
}

export function buildReceiptModel(
  sale: Sale,
  profile: ShopProfile,
  batteries: Pick<AdminBattery, 'id' | 'ah' | 'cca' | 'warrantyMonths'>[],
): ReceiptModel {
  const byId = new Map(batteries.map((b) => [b.id, b]));
  const lines: ReceiptLine[] = sale.lines.map((l) => ({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, total: round2(l.qty * l.unitPrice) }));
  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
  const net = round2(sale.total / (1 + VAT_RATE));
  const customer = sale.customer
    ? {
        name: `${sale.customer.firstName} ${sale.customer.lastName}`,
        idKind: (sale.customer.idNumber ? 'idNumber' : sale.customer.iban ? 'iban' : null) as ReceiptCustomer['idKind'],
        idValue: sale.customer.idNumber ?? sale.customer.iban ?? null,
      }
    : null;
  return {
    number: documentNumber(profile.receiptPrefix, sale.id),
    dateIso: sale.soldAt,
    dateDisplay: formatTbilisiDateTime(sale.soldAt),
    lines,
    subtotal,
    discount: sale.discount,
    total: sale.total,
    vatPayer: profile.vatPayer,
    net,
    vat: sale.total - net,
    paymentMethod: sale.paymentMethod,
    customer,
    warranty: sale.lines.map((l) => {
      const b = byId.get(l.batteryId);
      return {
        name: l.name,
        ah: b?.ah ?? null,
        cca: b?.cca ?? null,
        warrantyMonths: b?.warrantyMonths ?? null,
        endDate: b?.warrantyMonths === undefined ? null : warrantyEndDate(sale.soldAt, b.warrantyMonths),
      };
    }),
  };
}
