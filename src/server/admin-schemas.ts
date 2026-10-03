import { z } from 'zod';
import type { NewSale } from '@core/types';

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
  }),
  lines: z.array(z.object({ batteryId, qty: z.number().int().min(1).max(1000), unitPrice: money })).min(1).max(50),
  discount: money.default(0),
  paymentMethod: z.enum(['cash', 'transfer', 'card']),
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

const dateParam = z.preprocess(blankToUndefined, z.union([z.iso.datetime(), z.iso.date().transform((d) => `${d}T00:00:00.000Z`)]).optional());
export const rangeQuery = z.object({ from: dateParam, to: dateParam });
export const exportKind = z.enum(['sales', 'stock', 'movements']);
