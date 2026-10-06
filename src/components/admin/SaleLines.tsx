'use client';

import { useMemo, useRef, useState, type RefObject } from 'react';
import { lineTotal, specLine, type AdminBattery } from '@/lib/admin-api';
import { labels } from './labels';

export interface SaleLineDraft {
  key: number;
  batteryId: string;
  qty: number;
  unitPrice: number;
}

interface Props {
  batteries: AdminBattery[] | null;
  lines: SaleLineDraft[];
  onLines: (lines: SaleLineDraft[]) => void;
  idPrefix: string;
  maxLines?: number;
  capAtStock?: boolean;
  showLineTotals?: boolean;
  searchRef?: RefObject<HTMLInputElement | null>;
}

const t = labels.newSale;
const MAX_DEFAULT = 10;

export default function SaleLines({
  batteries,
  lines,
  onLines,
  idPrefix,
  maxLines = MAX_DEFAULT,
  capAtStock = false,
  showLineTotals = false,
  searchRef,
}: Props) {
  const [search, setSearch] = useState('');
  const keyRef = useRef(1);

  const q = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q || !batteries) return [];
    return batteries
      .filter((b) => `${b.name} ${b.ah} ${b.cca} ${b.caseCode}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [batteries, q]);

  const byId = useMemo(() => new Map((batteries ?? []).map((b) => [b.id, b])), [batteries]);

  function stockOf(id: string): number | undefined {
    return byId.get(id)?.quantity;
  }

  function addBattery(id: string) {
    const b = byId.get(id);
    if (!b || lines.length >= maxLines) return;
    onLines([...lines, { key: keyRef.current++, batteryId: id, qty: 1, unitPrice: b.price ?? 0 }]);
    setSearch('');
  }

  function setQty(i: number, raw: string) {
    const stock = capAtStock ? (stockOf(lines[i].batteryId) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    const qty = Math.min(stock, Math.max(1, Number(raw) || 1));
    onLines(lines.map((x, k) => (k === i ? { ...x, qty } : x)));
  }

  function setPrice(i: number, raw: string) {
    onLines(lines.map((x, k) => (k === i ? { ...x, unitPrice: Math.max(0, Number(raw) || 0) } : x)));
  }

  return (
    <div>
      <div className="field">
        <label htmlFor={`${idPrefix}-search`}>{t.batterySearch}</label>
        <input
          ref={searchRef}
          type="text"
          id={`${idPrefix}-search`}
          autoComplete="off"
          placeholder={t.batterySearchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (matches.length > 0) addBattery(matches[0].id);
            }
          }}
        />
      </div>
      {matches.length > 0 && (
        <ul className="admin-pick">
          {matches.map((b) => (
            <li key={b.id}>
              <button type="button" disabled={(b.quantity ?? 1) === 0} onClick={() => addBattery(b.id)}>
                <b>{b.name}</b> <span className="mono">{specLine(b)}</span>{' '}
                {(b.quantity ?? 1) === 0 ? <span>{t.soldOut}</span> : <span>{`${b.quantity ?? '?'} ${t.left}`}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {lines.map((l, i) => {
        const b = byId.get(l.batteryId);
        return (
          <div className="admin-line" key={l.key}>
            <b>{b?.name ?? l.batteryId}</b>
            <div className="field">
              <label htmlFor={`qty-${idPrefix}-${l.key}`}>{t.qty}</label>
              <input
                type="number"
                id={`qty-${idPrefix}-${l.key}`}
                min={1}
                value={l.qty}
                onChange={(e) => setQty(i, e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`price-${idPrefix}-${l.key}`}>{t.unitPrice}</label>
              <input
                type="number"
                id={`price-${idPrefix}-${l.key}`}
                min={0}
                step="0.01"
                value={l.unitPrice}
                onChange={(e) => setPrice(i, e.target.value)}
              />
            </div>
            <button className="btn btn-line btn-sm" type="button" onClick={() => onLines(lines.filter((_, k) => k !== i))}>
              {t.removeLine}
            </button>
            {showLineTotals && l.qty > 1 && (
              <span className="mono admin-line-total">
                {l.qty} × {l.unitPrice.toFixed(2)} = {lineTotal(l.qty, l.unitPrice).toFixed(2)} ₾
              </span>
            )}
          </div>
        );
      })}
      {lines.length < maxLines && lines.length > 0 && <p className="admin-hint">{t.addLine}</p>}
    </div>
  );
}
