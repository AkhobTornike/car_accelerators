import type { Battery, Sale, SaleVoid, StockMovement } from './types.ts';

export interface Column<T> { header: string; value: (row: T) => string | number | null | undefined }

// Cells that start with these are treated as formulas by Excel/Sheets (CSV injection) — customer names come from a form.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'number' ? String(v) : v;
  if (typeof v === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180, CRLF, UTF-8 BOM so Excel opens Georgian text correctly. */
export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(c.value(r))).join(','));
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

/** One row per sale line; sale-level fields repeat. Voided sales stay in the export, marked. */
export function salesToCsv(sales: Sale[], voids: SaleVoid[]): string {
  const voided = new Map(voids.map((v) => [v.saleId, v]));
  type Row = { sale: Sale; line: Sale['lines'][number]; first: boolean };
  const rows: Row[] = sales.flatMap((sale) => sale.lines.map((line, i) => ({ sale, line, first: i === 0 })));
  const cols: Column<Row>[] = [
    { header: 'sale_id', value: (r) => r.sale.id },
    { header: 'date', value: (r) => r.sale.soldAt },
    { header: 'status', value: (r) => (voided.has(r.sale.id) ? 'voided' : 'completed') },
    { header: 'sale_type', value: (r) => (r.sale.customer ? 'customer' : 'quick') },
    { header: 'first_name', value: (r) => r.sale.customer?.firstName },
    { header: 'last_name', value: (r) => r.sale.customer?.lastName },
    { header: 'id_number', value: (r) => r.sale.customer?.idNumber },
    { header: 'iban', value: (r) => r.sale.customer?.iban },
    { header: 'phone', value: (r) => r.sale.customer?.phone },
    { header: 'battery_id', value: (r) => r.line.batteryId },
    { header: 'item', value: (r) => r.line.name },
    { header: 'qty', value: (r) => r.line.qty },
    { header: 'unit_price', value: (r) => r.line.unitPrice },
    { header: 'line_total', value: (r) => Math.round(r.line.qty * r.line.unitPrice * 100) / 100 },
    { header: 'discount', value: (r) => (r.first ? r.sale.discount : '') },
    { header: 'sale_total', value: (r) => (r.first ? r.sale.total : '') },
    { header: 'payment', value: (r) => r.sale.paymentMethod },
    { header: 'note', value: (r) => r.sale.note },
    { header: 'void_reason', value: (r) => voided.get(r.sale.id)?.reason },
  ];
  return toCsv(rows, cols);
}

/** Internal stock sheet — includes cost price, never expose through a public route. */
export function stockToCsv(batteries: Battery[]): string {
  return toCsv(batteries, [
    { header: 'id', value: (b) => b.id }, { header: 'name', value: (b) => b.name }, { header: 'tech', value: (b) => b.tech },
    { header: 'ah', value: (b) => b.ah }, { header: 'cca', value: (b) => b.cca }, { header: 'quantity', value: (b) => b.quantity },
    { header: 'stock', value: (b) => b.stock }, { header: 'price', value: (b) => b.price }, { header: 'cost_price', value: (b) => b.costPrice },
    { header: 'stock_value_at_cost', value: (b) => (b.quantity !== undefined && b.costPrice != null ? Math.round(b.quantity * b.costPrice * 100) / 100 : '') },
  ]);
}

export function movementsToCsv(movements: StockMovement[]): string {
  return toCsv(movements, [
    { header: 'id', value: (m) => m.id }, { header: 'date', value: (m) => m.at }, { header: 'battery_id', value: (m) => m.batteryId },
    { header: 'delta', value: (m) => m.delta }, { header: 'kind', value: (m) => m.kind }, { header: 'sale_id', value: (m) => m.saleId },
    { header: 'unit_cost', value: (m) => m.unitCost }, { header: 'note', value: (m) => m.note },
  ]);
}
