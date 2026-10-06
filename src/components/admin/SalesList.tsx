'use client';

import { useEffect, useState } from 'react';
import { AdminApiError, formatMoney, listSales, voidSale, type Sale, type SaleVoid } from '@/lib/admin-api';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.sales;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  return { from: isoDay(from), to: isoDay(to) };
}

const fmtDate = new Intl.DateTimeFormat('ka-GE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tbilisi' });

export default function SalesList({ onSignOut }: { onSignOut: () => void }) {
  const [range] = useState(defaultRange);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [query, setQuery] = useState({ from: range.from, to: range.to, n: 0 });
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [voids, setVoids] = useState<Map<string, SaleVoid>>(new Map());
  const [error, setError] = useState<AdminApiError | null>(null);
  const [voidFor, setVoidFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    let live = true;
    listSales(query.from || undefined, query.to || undefined)
      .then((r) => {
        if (!live) return;
        setSales(r.sales);
        setVoids(new Map(r.voids.map((v) => [v.saleId, v])));
      })
      .catch((e) => {
        if (live) setError(e as AdminApiError);
      });
    return () => {
      live = false;
    };
  }, [query]);

  function reload() {
    setSales(null);
    setError(null);
    setQuery({ from, to, n: query.n + 1 });
  }

  async function doVoid(id: string) {
    if (!reason.trim() || voiding) return;
    setVoiding(true);
    try {
      await voidSale(id, reason.trim());
      setVoidFor(null);
      setReason('');
      reload();
    } catch (e) {
      setError(e as AdminApiError);
    } finally {
      setVoiding(false);
    }
  }

  return (
    <div>
      <div className="admin-grid">
        <div className="field">
          <label htmlFor="sales-from">{t.from}</label>
          <input type="date" id="sales-from" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sales-to">{t.to}</label>
          <input type="date" id="sales-to" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="field field-end">
          <button className="btn btn-line" type="button" onClick={reload}>
            {t.filter}
          </button>
        </div>
      </div>
      {sales === null && !error && <p className="admin-hint">{labels.loading}</p>}
      {error && <RequestError error={error} onRetry={reload} onSignOut={onSignOut} />}
      {sales !== null && !error && sales.length === 0 && <p className="admin-hint">{labels.empty}</p>}
      <ul className="admin-cards">
        {(sales ?? []).map((s) => {
          const v = voids.get(s.id);
          return (
            <li key={s.id} className={v ? 'voided' : undefined} aria-live="polite">
              <div className="admin-card-head">
                <b>{s.customer.firstName} {s.customer.lastName}</b>
                <span className="mono">{formatMoney(s.total)}</span>
              </div>
              <p className="admin-small">
                {fmtDate.format(new Date(s.soldAt))} · {s.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')} · {t.payment}: {s.paymentMethod}
              </p>
              <p className="admin-small">
                {t.status}: {v ? `${t.voided} (${t.voidReasonShown}: ${v.reason})` : labels.sales.active}
              </p>
              {!v && voidFor !== s.id && (
                <button className="btn btn-line btn-sm" type="button" onClick={() => { setVoidFor(s.id); setReason(''); }}>
                  {t.voidAction}
                </button>
              )}
              {!v && voidFor === s.id && (
                <div className="admin-void">
                  <div className="field">
                    <label htmlFor={`void-${s.id}`}>{t.voidReason}</label>
                    <input type="text" id={`void-${s.id}`} autoComplete="off" value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                  <button className="btn btn-solid btn-sm" type="button" disabled={voiding || !reason.trim()} onClick={() => void doVoid(s.id)}>
                    {t.voidConfirm}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
