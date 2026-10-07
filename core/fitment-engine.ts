import type { Battery, Fitment, Match, Note, Rejection, RejectReason, Segment, Tech, Tier, VehicleType } from './types.ts';

// Defaults from PLAN.md. Business thresholds — to be confirmed with the shop.
export const FITMENT_CONFIG = {
  ahMaxFactor: 1.25,      // offered Ah may exceed OEM min by at most 25%
  dimToleranceMm: 2,      // only used when the case code is unknown
  oemAhFactor: 1.1,       // up to +10% Ah still counts as "OEM-equivalent"
  upgradeCcaFactor: 1.15, // from +15% CCA on it is labelled an upgrade
} as const;

const TECH_RANK: Record<Tech, number> = { SMF: 1, EFB: 2, AGM: 3, 'DEEP-CYCLE': 0 };
// Which battery segments a vehicle type may take. Vans use car batteries and, for big ones, truck batteries.
const SEGMENTS_FOR: Record<VehicleType, Segment[]> = { car: ['car'], van: ['car', 'truck'], truck: ['truck'], moto: ['moto'] };
const STOCK_RANK = { in: 0, order: 1, out: 2 } as const;

export function specLine(b: Battery): string {
  return `${b.polarity}, ${b.caseCode}, ${b.ah}Ah, ${b.cca}A`;
}

function requiredTechRank(f: Fitment): number {
  return Math.max(TECH_RANK[f.oem.techMin], f.startStop ? TECH_RANK.EFB : TECH_RANK.SMF);
}

function reject(f: Fitment, b: Battery): RejectReason[] {
  const { oem } = f;
  const r: RejectReason[] = [];
  if (f.exclude?.includes(b.id)) return ['excluded'];
  if (!b.active) r.push('inactive');
  if (!SEGMENTS_FOR[f.type].includes(b.segment)) r.push('segment');
  if (b.voltage !== 12) r.push('voltage');
  if (oem.polarity && b.polarity !== oem.polarity) r.push('polarity');

  if (oem.caseCode) {
    if (b.caseCode !== oem.caseCode) r.push('case');
  } else if (oem.dimsMm) {
    const t = FITMENT_CONFIG.dimToleranceMm;
    const d = b.dimsMm;
    if (Math.abs(d.l - oem.dimsMm.l) > t || Math.abs(d.w - oem.dimsMm.w) > t || Math.abs(d.h - oem.dimsMm.h) > t) r.push('dims');
  } else if (f.source !== 'estimated') {
    r.push('case'); // no size info on the OEM side => cannot confirm fit
  }

  if (oem.holdDown && b.holdDown !== oem.holdDown) r.push('holddown');
  if (oem.terminal && b.terminal !== oem.terminal) r.push('terminal');
  if (b.ah < oem.ahMin) r.push('ah-low');
  if (b.ah > (oem.ahMax ?? oem.ahMin * FITMENT_CONFIG.ahMaxFactor)) r.push('ah-high');
  if (b.cca < oem.ccaMin) r.push('cca-low');
  if (TECH_RANK[b.tech] < requiredTechRank(f)) r.push('tech');
  return r;
}

function classify(f: Fitment, b: Battery): { tier: Tier; notes: Note[] } {
  const notes: Note[] = [];
  const techUp = TECH_RANK[b.tech] > requiredTechRank(f);
  const ahUp = b.ah > f.oem.ahMin * FITMENT_CONFIG.oemAhFactor;
  const ccaUp = b.cca >= f.oem.ccaMin * FITMENT_CONFIG.upgradeCcaFactor;
  if (techUp) notes.push('tech-upgrade');
  if (ahUp) notes.push('higher-capacity');
  if (ccaUp) notes.push('higher-cca');
  if (b.stock === 'order') notes.push('order-only');
  if (b.stock === 'out') notes.push('out-of-stock');
  if (f.source === 'estimated') notes.push('confirm-fit');
  return { tier: techUp || ahUp || ccaUp ? 'upgrade' : 'oem', notes };
}

/** Pure function: every battery that fits this exact vehicle variant, best first. */
export function matchBatteries(f: Fitment, batteries: Battery[]): Match[] {
  const out: Match[] = [];
  for (const b of batteries) {
    if (f.exclude?.includes(b.id)) continue;
    const pinned = f.include?.includes(b.id) && b.active;
    if (!pinned && reject(f, b).length) continue;
    const c = pinned ? { tier: 'oem' as Tier, notes: ['pinned' as Note] } : classify(f, b);
    if (pinned && f.source === 'estimated') c.notes.push('confirm-fit');
    out.push({ battery: b, tier: c.tier, spec: specLine(b), notes: c.notes });
  }
  const tierRank = { oem: 0, upgrade: 1 } as const;
  return out.sort((a, b) =>
    tierRank[a.tier] - tierRank[b.tier]
    || STOCK_RANK[a.battery.stock] - STOCK_RANK[b.battery.stock]
    || (a.battery.price ?? Infinity) - (b.battery.price ?? Infinity)
    || a.battery.id.localeCompare(b.battery.id));
}

/** Admin/test only — never expose through the public API (it would leak the whole catalogue logic). */
export function explainRejections(f: Fitment, batteries: Battery[]): Rejection[] {
  return batteries.flatMap((battery) => {
    const reasons = reject(f, battery);
    return reasons.length ? [{ battery, reasons }] : [];
  });
}

export function yearInRange(f: Pick<Fitment, 'yearFrom' | 'yearTo'>, year: number): boolean {
  return year >= f.yearFrom && year <= f.yearTo;
}
