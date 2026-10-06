import { z } from 'zod';
import type { Battery, NewSale } from '@core/types';

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalText = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
const money = z.number().finite().min(0).max(1_000_000);
const batteryId = z.string().trim().min(1).max(60);

export const newSaleBody = z.object({
  customer: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    idNumber: z.preprocess(blankToUndefined, z.string().trim().regex(/^(\d{9}|\d{11})$/).optional()),
    iban: z.preprocess((v) => { const b = blankToUndefined(v); return typeof b === 'string' ? b.replace(/\s+/g, '').toUpperCase() : b; }, z.string().regex(/^GE\d{2}[A-Z]{2}\d{16}$/).optional()),
    phone: optionalText(30),
  }).optional(), // omitted = quick sale (no customer data)
  lines: z.array(z.object({ batteryId, qty: z.number().int().min(1).max(1000), unitPrice: money })).min(1).max(50),
  discount: money.default(0),
  paymentMethod: z.enum(['cash', 'transfer', 'card']).default('cash'),
  note: optionalText(500),
  soldAt: z.preprocess(blankToUndefined, z.iso.datetime().optional()),
}).transform((b): NewSale => ({
  customer: b.customer,
  // name/unitCost are filled from the catalogue by the repository.
  lines: b.lines.map((l) => ({ ...l, name: '', unitCost: null })),
  discount: b.discount, paymentMethod: b.paymentMethod, note: b.note, soldAt: b.soldAt,
}));

export const voidBody = z.object({ reason: z.string().trim().min(1).max(500) });
export const receiveBody = z.object({ batteryId, qty: z.number().int().min(1).max(100000), unitCost: money.nullable().optional(), note: optionalText(500) });
export const adjustBody = z.object({ batteryId, countedQuantity: z.number().int().min(0).max(100000), note: optionalText(500) });

// A date without a time means the whole calendar day in the shop's time zone (Georgia is UTC+4, no daylight saving).
// `from` = start of that day; `to` = start of the NEXT day, because the range end is exclusive — so "to=today" includes today.
const SHOP_OFFSET = '+04:00';
const dayStart = (d: string) => new Date(`${d}T00:00:00${SHOP_OFFSET}`).toISOString();
const nextDayStart = (d: string) => new Date(new Date(`${d}T00:00:00${SHOP_OFFSET}`).getTime() + 24 * 3600 * 1000).toISOString();
const dateOr = (day: (d: string) => string) =>
  z.preprocess(blankToUndefined, z.union([z.iso.datetime(), z.iso.date().transform(day)]).optional());
export const rangeQuery = z.object({ from: dateOr(dayStart), to: dateOr(nextDayStart) });
export const exportKind = z.enum(['sales', 'stock', 'movements']);

// ---- products (batteries) ----
const productText = (max: number) => z.string().trim().min(1).max(max);
const upper = (v: unknown) => (typeof v === 'string' ? v.trim().toUpperCase() : v);
const productFields = {
  brand: productText(60),
  name: productText(80),
  segment: z.enum(['car', 'truck', 'moto', 'deep']),
  tech: z.enum(['SMF', 'EFB', 'AGM', 'DEEP-CYCLE']),
  ah: z.number().positive().max(300),
  cca: z.number().positive().max(2000),
  polarity: z.enum(['L+', 'R+']),
  caseCode: z.preprocess(upper, z.string().regex(/^[A-Z0-9-]{1,20}$/)),
  dimsMm: z.object({ l: z.number().positive().max(2000), w: z.number().positive().max(2000), h: z.number().positive().max(2000) }),
  terminal: z.preprocess(blankToUndefined, z.string().trim().min(1).max(40).optional()),
  holdDown: z.preprocess(blankToUndefined, z.string().trim().min(1).max(40).optional()),
  warrantyMonths: z.number().int().min(0).max(120),
  price: money.nullable(),
  costPrice: money.nullable().optional(),
  stock: z.enum(['in', 'order', 'out']),
  oemCodes: z.array(z.string().trim().min(1).max(40)).max(40).transform((a) => [...new Set(a)]),
  active: z.boolean(),
  images: z.array(z.string().url().startsWith('https://').max(300)).max(6),
};

const slugBase = (name: string) =>
  name.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'product';

export const newBatteryBody = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,39}$/).optional(),
  ...productFields,
  brand: productFields.brand.default('AMPER'),
  stock: productFields.stock.default('in'),
  oemCodes: productFields.oemCodes.default([]),
  active: productFields.active.default(true),
  images: productFields.images.default([]),
  quantity: z.number().int().min(0).max(100000).optional(), // opening stock → ledger 'initial' movement
}).transform((b): { battery: Omit<Battery, 'quantity'>; initialQuantity: number | undefined } => {
  const { quantity, id, ...rest } = b;
  const generated = `${slugBase(b.name)}-${Math.random().toString(16).slice(2, 6)}`.slice(0, 40);
  return { battery: { ...rest, id: id ?? generated, voltage: 12 }, initialQuantity: quantity };
});

// PATCH: any subset of the catalogue fields. Unknown keys — notably `quantity` and `id` — are rejected (strict):
// stock levels only change through sales, receive and count, never by editing the product.
export const patchBatteryBody = z.object(productFields).partial().strict();
