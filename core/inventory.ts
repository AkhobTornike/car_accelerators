import type { Battery, NewMovement, Sale, SaleLine, SaleVoid, StockMovement } from './types.ts';

export class InsufficientStockError extends Error {
  constructor(public batteryId: string, public available: number, public requested: number) {
    super(`insufficient stock for ${batteryId}: have ${available}, need ${requested}`);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function saleTotal(lines: Pick<SaleLine, 'qty' | 'unitPrice'>[], discount: number): number {
  return round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) - discount);
}

export function quantityFromMovements(movements: Pick<StockMovement, 'delta'>[]): number {
  return movements.reduce((s, m) => s + m.delta, 0);
}

/** Problems with a sale that is about to be recorded; empty = OK. Lines for the same battery are summed. */
export function checkSale(sale: { lines: SaleLine[]; discount: number }, batteries: Battery[]): string[] {
  const errors: string[] = [];
  if (!sale.lines.length) errors.push('sale has no lines');
  const byId = new Map(batteries.map((b) => [b.id, b]));
  const wanted = new Map<string, number>();
  for (const l of sale.lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1) errors.push(`${l.batteryId}: qty must be a positive integer`);
    if (!(l.unitPrice >= 0)) errors.push(`${l.batteryId}: unitPrice must be >= 0`);
    wanted.set(l.batteryId, (wanted.get(l.batteryId) ?? 0) + l.qty);
  }
  for (const [id, qty] of wanted) {
    const b = byId.get(id);
    if (!b) errors.push(`${id}: unknown battery`);
    else if (b.quantity === undefined) errors.push(`${id}: stock quantity is unknown — set it before selling`);
    else if (b.quantity < qty) errors.push(`${id}: only ${b.quantity} in stock, ${qty} requested`);
  }
  if (!(sale.discount >= 0)) errors.push('discount must be >= 0');
  else if (!errors.length && saleTotal(sale.lines, sale.discount) < 0) errors.push('discount exceeds the sale amount');
  return errors;
}

export function movementsForSale(sale: Sale): NewMovement[] {
  return sale.lines.map((l) => ({ at: sale.soldAt, batteryId: l.batteryId, delta: -l.qty, kind: 'sale', saleId: sale.id, unitCost: l.unitCost ?? null }));
}

export function movementsForVoid(sale: Sale, v: SaleVoid): NewMovement[] {
  return sale.lines.map((l) => ({ at: v.at, batteryId: l.batteryId, delta: l.qty, kind: 'sale-void', saleId: sale.id, note: v.reason }));
}

/** New battery state after movements. Throws InsufficientStockError rather than going below zero.
 *  Keeps `stock` consistent: 0 → 'out'; positive after 'out' → 'in'; 'order' is a manual state and is left alone. */
export function applyMovements(battery: Battery, movements: Pick<NewMovement, 'batteryId' | 'delta'>[]): Battery {
  const mine = movements.filter((m) => m.batteryId === battery.id);
  const delta = quantityFromMovements(mine);
  const before = battery.quantity ?? 0;
  const quantity = before + delta;
  if (quantity < 0) throw new InsufficientStockError(battery.id, before, -delta);
  let stock = battery.stock;
  if (quantity === 0 && stock === 'in') stock = 'out';
  else if (quantity > 0 && stock === 'out') stock = 'in';
  return { ...battery, quantity, stock };
}
