'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdminApiError,
  adjustStock,
  deleteProduct,
  formatMoney,
  listBatteries,
  patchProduct,
  receiveStock,
  specLine,
  type AdminBattery,
} from '@/lib/admin-api';
import ProductForm from './ProductForm';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.stock;

type Action = { id: string; kind: 'receive' | 'count' } | null;
type Panel = { mode: 'add' } | { mode: 'edit'; battery: AdminBattery } | null;

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
  const [panel, setPanel] = useState<Panel>(null);
  const [deleting, setDeleting] = useState<AdminBattery | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const caseCodes = useMemo(() => [...new Set((rows ?? []).map((b) => b.caseCode))].sort(), [rows]);

  function saved(name: string) {
    setPanel(null);
    setInfo(`${name} — ${t.saved}`);
    reload();
  }

  async function setActive(battery: AdminBattery, active: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await patchProduct(battery.id, { active });
      reload();
    } catch (e) {
      setError(e as AdminApiError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(battery: AdminBattery) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProduct(battery.id);
      setDeleting(null);
      setDeleteBlocked(false);
      setInfo(t.deleted);
      reload();
    } catch (e) {
      const err = e as AdminApiError;
      if (err.code === 'has_history') {
        setDeleteBlocked(true);
      } else if (err.code === 'not_found' || err.status === 404) {
        setDeleting(null);
        setDeleteBlocked(false);
        reload();
      } else {
        setError(err);
      }
    } finally {
      setBusy(false);
    }
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
      <div className="admin-row-actions">
        <button className="btn btn-solid btn-sm" type="button" onClick={() => { setPanel({ mode: 'add' }); setInfo(null); }}>
          {t.addProduct}
        </button>
      </div>
      {panel && (
        <div className="admin-panel">
          <ProductForm
            initial={panel.mode === 'edit' ? panel.battery : null}
            caseCodes={caseCodes}
            onClose={() => setPanel(null)}
            onSaved={saved}
            onImages={(id, imgs) => setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, images: imgs } : r)) ?? null)}
          />
        </div>
      )}
      {rows !== null && rows.length === 0 && !error && !panel && <p className="admin-hint">{labels.empty}</p>}
      <ul className="admin-cards">
        {(rows ?? []).map((b) => (
          <li key={b.id} className={`${(b.quantity ?? 1) === 0 ? 'empty-stock' : ''}${b.active ? '' : ' is-hidden'}`}>
            <div className="admin-card-head">
              <b>{b.name}</b>
              {!b.active && <span className="badge-hidden">{t.hidden}</span>}
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
            {action?.id !== b.id && deleting?.id !== b.id && (
              <div className="admin-row-actions">
                <button className="btn btn-line btn-sm" type="button" onClick={() => open(b.id, 'receive')}>
                  {t.receive}
                </button>
                <button className="btn btn-line btn-sm" type="button" onClick={() => open(b.id, 'count', b.quantity)}>
                  {t.count}
                </button>
                <button className="btn btn-line btn-sm" type="button" onClick={() => { setPanel({ mode: 'edit', battery: b }); setInfo(null); }}>
                  {t.edit}
                </button>
                <button
                  className="btn btn-line btn-sm"
                  type="button"
                  onClick={() => { setDeleting(b); setDeleteBlocked(false); setError(null); }}
                >
                  {t.remove}
                </button>
                {!b.active && (
                  <button className="btn btn-line btn-sm" type="button" disabled={busy} onClick={() => void setActive(b, true)}>
                    {t.show}
                  </button>
                )}
              </div>
            )}
            {deleting?.id === b.id && !deleteBlocked && (
              <div className="admin-void">
                <p>
                  {t.confirmDelete} <b>{b.name}</b>?
                </p>
                <div className="admin-row-actions">
                  <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={() => void confirmDelete(b)}>
                    {t.remove}
                  </button>
                  <button className="btn btn-line btn-sm" type="button" onClick={() => setDeleting(null)}>
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
            {deleting?.id === b.id && deleteBlocked && (
              <div className="admin-void">
                <p role="alert">{t.deleteHasHistory}</p>
                <div className="admin-row-actions">
                  <button
                    className="btn btn-solid btn-sm"
                    type="button"
                    disabled={busy}
                    onClick={() => { setDeleting(null); setDeleteBlocked(false); void setActive(b, false); }}
                  >
                    {t.hide}
                  </button>
                  <button
                    className="btn btn-line btn-sm"
                    type="button"
                    onClick={() => { setDeleting(null); setDeleteBlocked(false); }}
                  >
                    {t.cancel}
                  </button>
                </div>
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
