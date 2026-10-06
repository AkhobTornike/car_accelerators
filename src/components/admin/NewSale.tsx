'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AdminApiError,
  calcSaleTotal,
  createSale,
  detectIdDocument,
  formatMoney,
  listBatteries,
  type AdminBattery,
  type Sale,
} from '@/lib/admin-api';
import QuickSale from './QuickSale';
import RequestError from './RequestError';
import SaleLines, { type SaleLineDraft } from './SaleLines';
import { labels } from './labels';

const t = labels.newSale;

export default function NewSale({ onSignOut }: { onSignOut: () => void }) {
  const [mode, setMode] = useState<'quick' | 'form'>('quick');
  const [batteries, setBatteries] = useState<AdminBattery[] | null>(null);
  const [loadError, setLoadError] = useState<AdminApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idOrIban, setIdOrIban] = useState('');
  const [idError, setIdError] = useState(false);
  const [phone, setPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [payment, setPayment] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<AdminApiError | null>(null);
  const [done, setDone] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let live = true;
    listBatteries()
      .then((b) => {
        if (live) setBatteries(b.batteries.filter((x) => x.active));
      })
      .catch((e) => {
        if (live) setLoadError(e as AdminApiError);
      });
    return () => {
      live = false;
    };
  }, [nonce]);

  function retryLoad() {
    setLoadError(null);
    setBatteries(null);
    setNonce((n) => n + 1);
  }
  useEffect(() => {
    if (done) searchRef.current?.focus();
  }, [done]);

  const total = calcSaleTotal(lines, Number(discount) || 0);

  function startAgain() {
    setLines([]);
    setFirstName('');
    setLastName('');
    setIdOrIban('');
    setIdError(false);
    setPhone('');
    setDiscount('0');
    setPayment('cash');
    setNote('');
    setSubmitError(null);
    setDone(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || lines.length === 0) return;
    const doc = detectIdDocument(idOrIban);
    if (doc.kind === 'none' && idOrIban.trim()) {
      setIdError(true);
      return;
    }
    setIdError(false);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { sale } = await createSale({
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          ...(doc.kind === 'iban' ? { iban: doc.value } : {}),
          ...(doc.kind === 'idNumber' ? { idNumber: doc.value } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
        lines: lines.map((l) => ({ batteryId: l.batteryId, qty: l.qty, unitPrice: l.unitPrice })),
        discount: Number(discount) || 0,
        paymentMethod: payment,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setDone(sale);
    } catch (err) {
      setSubmitError(err as AdminApiError);
    } finally {
      setSubmitting(false);
    }
  }

  if (batteries === null && !loadError) return <p className="admin-hint">{labels.loading}</p>;
  if (loadError) return <RequestError error={loadError} onRetry={retryLoad} onSignOut={onSignOut} />;

  if (done) {
    return (
      <div className="admin-success" role="status">
        <p>
          <b>{t.success}</b>
        </p>
        <p>
          {t.saleId}: <span className="mono">{done.id}</span>
        </p>
        <p>
          {t.total}: <b>{formatMoney(done.total)}</b>
        </p>
        <p>
          {done.customer ? `${done.customer.firstName} ${done.customer.lastName}` : labels.sales.quickSale} · {done.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}
        </p>
        <button className="btn btn-solid" type="button" onClick={startAgain}>
          {t.again}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="segbar" role="group" aria-label={t.modeSwitch}>
        <button
          className="segbtn"
          type="button"
          aria-pressed={mode === 'quick'}
          onClick={() => setMode('quick')}
        >
          {labels.sales.quickSale}
        </button>
        <button className="segbtn" type="button" aria-pressed={mode === 'form'} onClick={() => setMode('form')}>
          {t.modeForm}
        </button>
      </div>
      {mode === 'quick' ? (
        <QuickSale onSignOut={onSignOut} />
      ) : (
        <div>
          <SaleLines batteries={batteries} lines={lines} onLines={setLines} idPrefix="sale" searchRef={searchRef} />
          <form onSubmit={(e) => void submit(e)}>
            <div className="admin-grid">
              <div className="field">
                <label htmlFor="sale-first">{t.firstName}</label>
                <input type="text" id="sale-first" autoComplete="off" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="sale-last">{t.lastName}</label>
                <input type="text" id="sale-last" autoComplete="off" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="sale-id">{t.idOrIban}</label>
                <input
                  type="text"
                  id="sale-id"
                  autoComplete="off"
                  placeholder={t.idOrIbanHint}
                  value={idOrIban}
                  aria-invalid={idError}
                  onChange={(e) => {
                    setIdOrIban(e.target.value);
                    setIdError(false);
                  }}
                />
                {idError && (
                  <p className="admin-ferr" role="alert">
                    {t.idOrIbanError}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="sale-phone">{t.phone}</label>
                <input type="text" id="sale-phone" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="sale-discount">{t.discount}</label>
                <input type="number" id="sale-discount" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="sale-pay">{t.payment}</label>
                <select id="sale-pay" value={payment} onChange={(e) => setPayment(e.target.value as 'cash' | 'transfer' | 'card')}>
                  <option value="cash">{t.cash}</option>
                  <option value="transfer">{t.transfer}</option>
                  <option value="card">{t.card}</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="sale-note">{t.note}</label>
              <input type="text" id="sale-note" autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <p className="admin-total">
              {t.total}: <b>{formatMoney(total)}</b>
            </p>
            {lines.length === 0 && <p className="admin-hint">{t.pickBatteryFirst}</p>}
            {submitError && <RequestError error={submitError} onSignOut={onSignOut} />}
            <button className="btn btn-solid" type="submit" disabled={submitting || lines.length === 0}>
              {t.submit}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
