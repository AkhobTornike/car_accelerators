import { describe, expect, it } from 'vitest';
import {
  VAT_RATE,
  buildReceiptModel,
  documentNumber,
  formatTbilisiDate, formatTbilisiDateTime,
  warrantyEndDate,
  type ReceiptModel,
} from './receipt';
import type { Sale } from './admin-api';
import type { ShopProfile } from '@/server/shop-profile';

const profile = (o: Partial<ShopProfile> = {}): ShopProfile => ({
  brand: 'AMPER.GE',
  legalName: 'შპს ამპერი',
  taxId: '123456789',
  address: 'თბილისი',
  phone: '+995 32 255 00 11',
  vatPayer: false,
  warrantyText: 'გარანტია',
  receiptPrefix: 'R',
  paperDefault: 'a4',
  ...o,
});

const sale = (o: Partial<Sale> = {}): Sale => ({
  id: 's-20260110-a1b2c3',
  soldAt: '2026-01-10T10:00:00.000Z',
  customer: { firstName: 'გ', lastName: 'ბ', idNumber: '12345678901' },
  lines: [{ batteryId: 'b1', name: 'S60', qty: 2, unitPrice: 100 }],
  discount: 10,
  total: 190,
  paymentMethod: 'cash',
  ...o,
});

const batteries = [{ id: 'b1', ah: 60, cca: 540, warrantyMonths: 24 }];

function model(s: Sale = sale(), p: ShopProfile = profile()): ReceiptModel {
  return buildReceiptModel(s, p, batteries);
}

describe('documentNumber', () => {
  it('prefixes the stored id date/number part', () => {
    expect(documentNumber('R', 's-20260110-a1b2c3')).toBe('R20260110-a1b2c3');
    expect(documentNumber('R', 'custom-id')).toBe('Rcustom-id');
  });
});

describe('VAT split', () => {
  it('uses 18 % on VAT-inclusive totals for payers', () => {
    expect(VAT_RATE).toBe(0.18);
    const m = model(sale({ total: 118 }), profile({ vatPayer: true }));
    expect(m.vatPayer).toBe(true);
    expect(m.net).toBe(100);
    expect(m.vat).toBeCloseTo(18, 10);
  });
  it('still computes the split when not a payer (UI hides it)', () => {
    const m = model();
    expect(m.vatPayer).toBe(false);
    expect(m.net + m.vat).toBeCloseTo(m.total, 10);
  });
});

describe('totals and lines', () => {
  it('sums lines, keeps discount and total from the sale', () => {
    const m = model();
    expect(m.lines).toEqual([{ name: 'S60', qty: 2, unitPrice: 100, total: 200 }]);
    expect(m.subtotal).toBe(200);
    expect(m.discount).toBe(10);
    expect(m.total).toBe(190);
  });
  it('resolves the customer block, iban included', () => {
    expect(model().customer).toEqual({ name: 'გ ბ', idKind: 'idNumber', idValue: '12345678901' });
    const iban = model(sale({ customer: { firstName: 'გ', lastName: 'ბ', iban: 'GE00AB0000000000000000' } }));
    expect(iban.customer).toEqual({ name: 'გ ბ', idKind: 'iban', idValue: 'GE00AB0000000000000000' });
    expect(model(sale({ customer: undefined })).customer).toBeNull();
  });
});

describe('warranty card data', () => {
  it('resolves Ah/CCA/months and the end date from batteries', () => {
    const [w] = model().warranty;
    expect(w).toMatchObject({ name: 'S60', ah: 60, cca: 540, warrantyMonths: 24 });
    expect(w.endDate).toContain('2028');
  });
  it('falls back to nulls for a deleted product', () => {
    const [w] = buildReceiptModel(sale(), profile(), []).warranty;
    expect(w).toEqual({ name: 'S60', ah: null, cca: null, warrantyMonths: null, endDate: null });
  });
  it('clamps month-end overflow', () => {
    expect(warrantyEndDate('2025-01-31T10:00:00.000Z', 1)).toContain('2025');
  });
});

describe('dates', () => {
  it('formats in Asia/Tbilisi', () => {
    expect(formatTbilisiDate('2026-01-10T10:00:00.000Z')).toBe('10.01.2026');
    expect(formatTbilisiDateTime('2026-01-10T10:00:00.000Z')).toBe('10.01.2026 14:00');
    expect(model().dateDisplay).toContain('2026');
  });
});
