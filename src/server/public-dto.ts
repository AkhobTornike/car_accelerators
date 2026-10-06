import type { Match } from '@core/types';
import type { Battery } from '@core/types';

// Explicit picks, never a spread: a new private field on Battery must not leak by accident.
export function toPublicBattery(b: Battery) {
  return {
    id: b.id, name: b.name, brand: b.brand, segment: b.segment, tech: b.tech, ah: b.ah, cca: b.cca, polarity: b.polarity,
    caseCode: b.caseCode, dimsMm: b.dimsMm, warrantyMonths: b.warrantyMonths, price: b.price, stock: b.stock,
    ...(b.quantity === undefined ? {} : { quantity: b.quantity }),
    images: b.images ?? [],
  };
}

export function toPublicMatch(m: Match) {
  return { ...toPublicBattery(m.battery), tier: m.tier, spec: m.spec, notes: m.notes };
}

export type PublicBattery = ReturnType<typeof toPublicBattery>;
export type PublicMatch = ReturnType<typeof toPublicMatch>;
