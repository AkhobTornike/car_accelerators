import type { Battery, Sale } from '@core/types';
import { describe, expect, it } from 'vitest';
import { buildWeeklySummary, summaryRecipients, DEFAULT_SUMMARY_TO } from './weekly-summary';

const bat = (id: string, quantity: number, over: Partial<Battery> = {}): Battery => ({
  id, brand: 'AMPER', name: `AMPER ${id}`, segment: 'car', tech: 'SMF', voltage: 12, ah: 60, cca: 500, polarity: 'L+',
  caseCode: 'L2', dimsMm: { l: 242, w: 175, h: 190 }, warrantyMonths: 24, price: 200, costPrice: 150, stock: 'in', quantity,
  oemCodes: [], active: true, ...over,
});
const sale = (id: string, total: number, lines: Sale['lines']): Sale => ({ id, soldAt: '2026-11-17T10:00:00Z', lines, discount: 0, total, paymentMethod: 'cash' });

const now = new Date('2026-11-18T10:00:00Z');
const base = {
  now, voids: [], previousSales: [], rotating: true,
  adminUrl: 'https://ampera.ge/m/abc/',
  sales: [
    sale('s1', 400, [{ batteryId: 'a', name: 'AMPER a', qty: 2, unitPrice: 200, unitCost: 150 }]),
    sale('s2', 200, [{ batteryId: 'b', name: 'AMPER b', qty: 1, unitPrice: 200, unitCost: null }]),
  ],
  batteries: [bat('a', 2), bat('b', 10), bat('c', 0), bat('d', 1, { active: false }), bat('e', 5, { price: null })],
};

describe('buildWeeklySummary', () => {
  it('counts sales, revenue, units and the top product', () => {
    const { text, subject } = buildWeeklySummary(base);
    expect(text).toContain('გაყიდვები: 2');
    expect(text).toContain('600.00 ₾');
    expect(text).toContain('გაყიდული ცალი: 3');
    expect(text).toContain('AMPER a — 2 ცალი');
    expect(subject).toContain('2 გაყიდვა');
  });
  it('leaves voided sales out', () => {
    const { text } = buildWeeklySummary({ ...base, voids: [{ id: 'v', saleId: 's1', at: now.toISOString(), reason: 'x' }] });
    expect(text).toContain('გაყიდვები: 1');
    expect(text).toContain('გაუქმებული გაყიდვა: 1');
  });
  it('lists low stock, out-of-stock count and ignores hidden products', () => {
    const { text } = buildWeeklySummary(base);
    expect(text).toContain('AMPER a — დარჩა 2');
    expect(text).not.toContain('AMPER d');
    expect(text).toContain('მარაგში არ არის: 1 პროდუქტი');
    expect(text).toContain('ფასი არ არის მითითებული: 1');
  });
  it('compares with the previous week and carries the admin link', () => {
    const { text, html } = buildWeeklySummary({ ...base, previousSales: [sale('p', 300, [])] });
    expect(text).toContain('+100%');
    expect(text).toContain('https://ampera.ge/m/abc/');
    expect(html).toContain('href="https://ampera.ge/m/abc/"');
    expect(text).toContain('ყოველ კვირას იცვლება');
  });
  it('escapes product names in the HTML', () => {
    const { html } = buildWeeklySummary({ ...base, batteries: [bat('x', 1, { name: '<b>X</b>' })] });
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
  });
});

describe('summaryRecipients', () => {
  it('uses the default address, or SUMMARY_EMAIL_TO when set', () => {
    expect(summaryRecipients({})).toEqual([DEFAULT_SUMMARY_TO]);
    expect(summaryRecipients({ SUMMARY_EMAIL_TO: 'a@x.ge, b@x.ge' })).toEqual(['a@x.ge', 'b@x.ge']);
  });
});
