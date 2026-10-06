'use client';

import { useEffect, useState } from 'react';
import {
  AdminApiError,
  adjustStock,
  formatMoney,
  listBatteries,
  receiveStock,
  specLine,
  type AdminBattery,
} from '@/lib/admin-api';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.stock;

type Action = { id: string; kind: 'receive' | 'count' } | null;

export default function StockTable({ onSignOut }: { onSignOut: () => void }) {
  const [rows, setRows] = useState<AdminBattery[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const [action, setAction] = useState<Action>(null);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listBatteries()
      .then((b) => {
        if (live) setRows(b.batteries);
      })
      .catch((e) => {
        if (live) setError(e as AdminApiError);
      });
    return () => {
      live = false;
    };
  }, [nonce]);

  function reload() {
    setRows(null);
    setError(null);
    setNonce((n) => n + 1);
  }

  function open(id: string, kind: 'receive' | 'count', current?: number) {
    setAction({ id, kind });
    setQty(kind === 'count' && current !== undefined ? String(current) : '');
    setCost('');
    setNote('');
    setInfo(null);
    setError(null);
  }

  async function save() {
    if (!action || saving) return;
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || (action.kind === 'receive' && n < 1)) return;
    setSaving(true);
    setInfo(null);
    try {
      if (action.kind === 'receive') {
        await receiveStock({
          batteryId: action.id,
          qty: n,
          ...(cost.trim() ? { unitCost: Number(cost) } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      } else {
        await adjustStock({ batteryId: action.id, countedQuantity: n, ...(note.trim() ? { note: note.trim() } : {}) });
      }
      setAction(null);
      reload();
    } catch (e) {
      const err = e as AdminApiError;
      if (err.kind === 'invalid' && err.code === 'no_change') setInfo(t.noChange);
      else setError(err);
    } finally {
      setSaving(false);
    }
  }

  if (rows === null && !error) return <p className="admin-hint">{labels.loading}</p>;

  return (
    <div>
      {error && <RequestError error={error} onRetry={reload} onSignOut={onSignOut} />}
      {rows !== null && rows.length === 0 && !error && <p className="admin-hint">{labels.empty}</p>}
      <ul className="admin-cards">
        {(rows ?? []).map((b) => (
          <li key={b.id} className={(b.quantity ?? 1) === 0 ? 'empty-stock' : undefined}>
            <div className="admin-card-head">
              <b>{b.name}</b>
              <span className="mono">{b.price === null ? t.askForPrice : formatMoney(b.price)}</span>
            </div>
            <p className="admin-small">
              {b.tech} · {specLine(b)} · {t.quantity}:{' '}
              <b className={(b.quantity ?? 0) <= 3 ? 'low' : undefined}>{b.quantity ?? t.notAvailable}</b> ·{' '}
              {t.status}: {b.stock === 'in' ? t.in : b.stock === 'order' ? t.order : t.out}
            </p>
            <p className="admin-small">
              {t.cost}: {b.costPrice === null || b.costPrice === undefined ? t.notAvailable : formatMoney(b.costPrice)}
            </p>
            {action?.id !== b.id && (
              <div className="admin-row-actions">
                <button className="btn btn-line btn-sm" type="button" onClick={() => open(b.id, 'receive')}>
                  {t.receive}
                </button>
                <button className="btn btn-line btn-sm" type="button" onClick={() => open(b.id, 'count', b.quantity)}>
                  {t.count}
                </button>
              </div>
            )}
            {action?.id === b.id && (
              <div className="admin-void">
                <div className="field">
                  <label htmlFor={`aq-${b.id}`}>{action.kind === 'receive' ? t.receiveQty : t.countedQty}</label>
                  <input type="number" id={`aq-${b.id}`} min={action.kind === 'receive' ? 1 : 0} step={1} value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                {action.kind === 'receive' && (
                  <div className="field">
                    <label htmlFor={`ac-${b.id}`}>{t.unitCost}</label>
                    <input type="number" id={`ac-${b.id}`} min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
                  </div>
                )}
                <div className="field">
                  <label htmlFor={`an-${b.id}`}>{t.noteOptional}</label>
                  <input type="text" id={`an-${b.id}`} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="admin-row-actions">
                  <button className="btn btn-solid btn-sm" type="button" disabled={saving} onClick={() => void save()}>
                    {t.save}
                  </button>
                  <button className="btn btn-line btn-sm" type="button" onClick={() => setAction(null)}>
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {info && (
        <p className="admin-hint" role="status">
          {info}
        </p>
      )}
    </div>
  );
}
