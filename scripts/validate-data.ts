import Ajv, { type ValidateFunction } from 'ajv';
import { createRequire } from 'node:module';
import { matchBatteries } from '../core/fitment-engine.ts';
import type { Battery, Fitment, Sale, SaleVoid, StockMovement } from '../core/types.ts';

const require = createRequire(import.meta.url);
const batterySchema = require('../core/schema/battery.schema.json');
const fitmentSchema = require('../core/schema/fitment.schema.json');
const saleSchema = require('../core/schema/sale.schema.json');
const movementSchema = require('../core/schema/stock-movement.schema.json');

export interface Issue {
  level: 'error' | 'warning';
  code: string;
  entity: 'battery' | 'fitment';
  id: string;
  message: string;
}

export interface ExtraData {
  sales?: unknown[];
  voids?: unknown[];
  movements?: unknown[];
}

const ajv = new Ajv({ allErrors: true });
ajv.addFormat('date-time', (s: string) => !Number.isNaN(Date.parse(s)));
const isBattery = ajv.compile(batterySchema);
const isFitment = ajv.compile(fitmentSchema);
const isSale = ajv.compile(saleSchema);
const isMovement = ajv.compile(movementSchema);

function rowId(row: unknown, index: number): string {
  return typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string'
    ? (row as { id: string }).id
    : `(index ${index})`;
}

function schemaIssues(
  validate: ValidateFunction,
  rows: unknown[],
  entity: 'battery' | 'fitment',
  out: Issue[],
  good: unknown[],
): void {
  rows.forEach((row, i) => {
    if (validate(row)) {
      good.push(row);
      return;
    }
    const id = rowId(row, i);
    for (const e of validate.errors ?? []) {
      out.push({ level: 'error', code: 'schema', entity, id, message: `${e.instancePath || '/'} ${e.message ?? 'invalid'}` });
    }
  });
}

function stringIds(rows: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string') {
      ids.add((row as { id: string }).id);
    }
  }
  return ids;
}

const normOem = (code: string) => code.toUpperCase().replace(/[\s.\-]/g, '');

// Mirrors saleTotal() in core/inventory.ts. That module cannot be imported here:
// plain-node --experimental-strip-types rejects its parameter properties, and the
// CLI must run with plain Node. Equivalence is pinned by a test in validate-data.test.ts.
const round2 = (n: number) => Math.round(n * 100) / 100;
const saleTotal = (lines: { qty: number; unitPrice: number }[], discount: number): number =>
  round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) - discount);

export function validateData(batteries: unknown[], fitments: unknown[], extra?: ExtraData): Issue[] {
  const issues: Issue[] = [];
  const goodBatteries: Battery[] = [];
  const goodFitments: Fitment[] = [];
  schemaIssues(isBattery, batteries, 'battery', issues, goodBatteries);
  schemaIssues(isFitment, fitments, 'fitment', issues, goodFitments);

  const batteryIds = stringIds(batteries);

  const batteryIdCounts = new Map<string, number>();
  for (const b of goodBatteries) batteryIdCounts.set(b.id, (batteryIdCounts.get(b.id) ?? 0) + 1);
  for (const [id, n] of batteryIdCounts) {
    if (n > 1) issues.push({ level: 'error', code: 'duplicate-id', entity: 'battery', id, message: `duplicate battery id "${id}" (${n} rows)` });
  }
  const fitmentIdCounts = new Map<string, number>();
  for (const f of goodFitments) fitmentIdCounts.set(f.id, (fitmentIdCounts.get(f.id) ?? 0) + 1);
  for (const [id, n] of fitmentIdCounts) {
    if (n > 1) issues.push({ level: 'error', code: 'duplicate-id', entity: 'fitment', id, message: `duplicate fitment id "${id}" (${n} rows)` });
  }

  for (const f of goodFitments) {
    if (f.yearFrom > f.yearTo) {
      issues.push({ level: 'error', code: 'bad-year-range', entity: 'fitment', id: f.id, message: `fitment "${f.id}": yearFrom ${f.yearFrom} > yearTo ${f.yearTo}` });
    }
    if (f.oem.ahMax !== undefined && f.oem.ahMax < f.oem.ahMin) {
      issues.push({ level: 'error', code: 'ah-window-empty', entity: 'fitment', id: f.id, message: `fitment "${f.id}": oem.ahMax ${f.oem.ahMax} < oem.ahMin ${f.oem.ahMin}` });
    }
    for (const ref of f.include ?? []) {
      if (!batteryIds.has(ref)) {
        issues.push({ level: 'error', code: 'unknown-battery-ref', entity: 'fitment', id: f.id, message: `fitment "${f.id}": unknown battery "${ref}" in include` });
      }
    }
    for (const ref of f.exclude ?? []) {
      if (!batteryIds.has(ref)) {
        issues.push({ level: 'error', code: 'unknown-battery-ref', entity: 'fitment', id: f.id, message: `fitment "${f.id}": unknown battery "${ref}" in exclude` });
      }
    }
    for (const ref of f.include ?? []) {
      if (f.exclude?.includes(ref)) {
        issues.push({ level: 'error', code: 'include-exclude-conflict', entity: 'fitment', id: f.id, message: `fitment "${f.id}": battery "${ref}" is in both include and exclude` });
      }
    }
  }

  const byKey = new Map<string, Fitment[]>();
  for (const f of goodFitments) {
    const key = [f.type, f.make, f.model, f.engine].join('|');
    byKey.set(key, [...(byKey.get(key) ?? []), f]);
  }
  for (const rows of byKey.values()) {
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i];
        const b = rows[j];
        if (a.yearFrom <= b.yearTo && b.yearFrom <= a.yearTo) {
          issues.push({ level: 'error', code: 'year-overlap', entity: 'fitment', id: a.id, message: `fitments "${a.id}" [${a.yearFrom}-${a.yearTo}] and "${b.id}" [${b.yearFrom}-${b.yearTo}] overlap` });
        }
      }
    }
  }

  const oemHolders = new Map<string, string[]>();
  for (const b of goodBatteries) {
    for (const code of b.oemCodes) {
      const norm = normOem(code);
      oemHolders.set(norm, [...(oemHolders.get(norm) ?? []), b.id]);
    }
  }
  for (const [norm, holders] of oemHolders) {
    const distinct = [...new Set(holders)];
    if (distinct.length > 1) {
      issues.push({ level: 'warning', code: 'duplicate-oem-code', entity: 'battery', id: distinct[0], message: `oem code "${norm}" is also on batteries ${distinct.slice(1).map((h) => `"${h}"`).join(', ')}` });
    }
  }

  for (const b of goodBatteries) {
    if ((b.stock === 'in' && b.quantity === 0) || (b.stock === 'out' && (b.quantity ?? 0) > 0)) {
      issues.push({ level: 'error', code: 'quantity-stock-mismatch', entity: 'battery', id: b.id, message: `battery "${b.id}": stock "${b.stock}" disagrees with quantity ${b.quantity}` });
    }
  }

  const activeBatteries = goodBatteries.filter((b) => b.active);
  for (const f of goodFitments) {
    if (matchBatteries(f, activeBatteries).length === 0) {
      issues.push({ level: 'warning', code: 'no-match', entity: 'fitment', id: f.id, message: `fitment "${f.id}": no battery matches — a customer would see an empty result` });
    }
  }

  if (extra === undefined) return issues;

  const goodSales: Sale[] = [];
  const goodMovements: StockMovement[] = [];
  schemaIssues(isSale, extra.sales ?? [], 'battery', issues, goodSales);
  schemaIssues(isMovement, extra.movements ?? [], 'battery', issues, goodMovements);
  const saleIds = stringIds(extra.sales ?? []);
  const voids: { v: SaleVoid; index: number }[] = [];
  (extra.voids ?? []).forEach((row, index) => {
    if (typeof row === 'object' && row !== null && typeof (row as SaleVoid).saleId === 'string') {
      voids.push({ v: row as SaleVoid, index });
    }
  });
  const voidId = (v: SaleVoid, index: number): string => (typeof v.id === 'string' ? v.id : `(index ${index})`);

  for (const s of goodSales) {
    if (Math.abs(s.total - saleTotal(s.lines, s.discount)) > 0.005) {
      issues.push({ level: 'error', code: 'sale-total-mismatch', entity: 'battery', id: s.id, message: `sale "${s.id}": total ${s.total} differs from computed ${saleTotal(s.lines, s.discount)}` });
    }
    for (const line of s.lines) {
      if (!batteryIds.has(line.batteryId)) {
        issues.push({ level: 'error', code: 'sale-unknown-battery', entity: 'battery', id: line.batteryId, message: `sale "${s.id}": unknown battery "${line.batteryId}"` });
      }
      if (!goodMovements.some((m) => m.kind === 'sale' && m.saleId === s.id && m.batteryId === line.batteryId)) {
        issues.push({ level: 'error', code: 'sale-without-movements', entity: 'battery', id: line.batteryId, message: `sale "${s.id}": no 'sale' movement for battery "${line.batteryId}"` });
      }
    }
  }

  const voidsBySale = new Map<string, { v: SaleVoid; index: number }[]>();
  for (const { v, index } of voids) {
    if (!saleIds.has(v.saleId)) {
      issues.push({ level: 'error', code: 'void-unknown-sale', entity: 'battery', id: voidId(v, index), message: `void for missing sale "${v.saleId}"` });
    }
    voidsBySale.set(v.saleId, [...(voidsBySale.get(v.saleId) ?? []), { v, index }]);
  }
  for (const [saleId, group] of voidsBySale) {
    group.slice(1).forEach(({ v, index }) => {
      issues.push({ level: 'error', code: 'void-duplicate', entity: 'battery', id: voidId(v, index), message: `two voids for sale "${saleId}"` });
    });
  }

  for (const m of goodMovements) {
    if (!batteryIds.has(m.batteryId)) {
      issues.push({ level: 'error', code: 'movement-unknown-battery', entity: 'battery', id: m.batteryId, message: `movement "${m.id}": unknown battery "${m.batteryId}"` });
    }
  }

  const movementsByBattery = new Map<string, StockMovement[]>();
  for (const m of goodMovements) {
    movementsByBattery.set(m.batteryId, [...(movementsByBattery.get(m.batteryId) ?? []), m]);
  }
  for (const b of goodBatteries) {
    const mine = movementsByBattery.get(b.id) ?? [];
    if (mine.length === 0) continue;
    const sum = mine.reduce((s, m) => s + m.delta, 0);
    if (b.quantity !== sum) {
      issues.push({ level: 'error', code: 'ledger-mismatch', entity: 'battery', id: b.id, message: `battery "${b.id}": quantity ${String(b.quantity)} differs from movement sum ${sum}` });
    }
  }
  for (const [batteryId, mine] of movementsByBattery) {
    if (!batteryIds.has(batteryId)) continue;
    const ordered = [...mine].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    let running = 0;
    for (const m of ordered) {
      running += m.delta;
      if (running < 0) {
        issues.push({ level: 'error', code: 'negative-running-stock', entity: 'battery', id: batteryId, message: `battery "${batteryId}": stock goes negative at movement "${m.id}" (${m.at})` });
        break;
      }
    }
  }

  return issues;
}
