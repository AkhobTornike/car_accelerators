'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdminApiError,
  calcSaleTotal,
  createSale,
  detectIdDocument,
  formatMoney,
  listBatteries,
  specLine,
  type AdminBattery,
  type Sale,
} from '@/lib/admin-api';
import RequestError from './RequestError';
import { labels } from './labels';

interface Line {
  key: number;
  batteryId: string;
  qty: number;
  unitPrice: number;
}

const MAX_LINES = 10;
const t = labels.newSale;

export default function NewSale({ onSignOut }: { onSignOut: () => void }) {
  const [batteries, setBatteries] = useState<AdminBattery[] | null>(null);
  const [loadError, setLoadError] = useState<AdminApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
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
  const searchRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(1);

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

  const q = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q || !batteries) return [];
    return batteries
      .filter((b) => `${b.name} ${b.ah} ${b.cca} ${b.caseCode}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [batteries, q]);

  const byId = useMemo(() => new Map((batteries ?? []).map((b) => [b.id, b])), [batteries]);
  const total = calcSaleTotal(lines, Number(discount) || 0);

  function addBattery(id: string) {
    const b = byId.get(id);
    if (!b || lines.length >= MAX_LINES) return;
    setLines([...lines, { key: keyRef.current++, batteryId: id, qty: 1, unitPrice: b.price ?? 0 }]);
    setSearch('');
  }

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
          {done.customer.firstName} {done.customer.lastName} · {done.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}
        </p>
        <button className="btn btn-solid" type="button" onClick={startAgain}>
          {t.again}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="sale-search">{t.batterySearch}</label>
        <input
          ref={searchRef}
          type="text"
          id="sale-search"
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
              <label htmlFor={`qty-${l.key}`}>{t.qty}</label>
              <input
                type="number"
                id={`qty-${l.key}`}
                min={1}
                value={l.qty}
                onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))}
              />
            </div>
            <div className="field">
              <label htmlFor={`price-${l.key}`}>{t.unitPrice}</label>
              <input
                type="number"
                id={`price-${l.key}`}
                min={0}
                step="0.01"
                value={l.unitPrice}
                onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, unitPrice: Math.max(0, Number(e.target.value) || 0) } : x)))}
              />
            </div>
            <button className="btn btn-line btn-sm" type="button" onClick={() => setLines(lines.filter((_, k) => k !== i))}>
              {t.removeLine}
            </button>
          </div>
        );
      })}
      {lines.length < MAX_LINES && lines.length > 0 && <p className="admin-hint">{t.addLine}</p>}
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
  );
}
