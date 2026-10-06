'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AdminApiError,
  calcSaleTotal,
  createSale,
  formatMoney,
  listBatteries,
  quickSaleBody,
  validateQuickLines,
  type AdminBattery,
  type Sale,
} from '@/lib/admin-api';
import RequestError from './RequestError';
import SaleLines, { type SaleLineDraft } from './SaleLines';
import { labels } from './labels';

const t = labels.newSale;

export default function QuickSale({ onSignOut }: { onSignOut: () => void }) {
  const [batteries, setBatteries] = useState<AdminBattery[] | null>(null);
  const [loadError, setLoadError] = useState<AdminApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
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

  function startAgain() {
    setLines([]);
    setErrors([]);
    setSubmitError(null);
    setDone(null);
  }

  const total = calcSaleTotal(lines, 0);
  const showTotal = lines.length > 1 || lines.some((l) => l.qty > 1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const stockOf = (id: string) => batteries?.find((b) => b.id === id)?.quantity;
    const problems = validateQuickLines(lines, stockOf);
    if (problems.length > 0) {
      setErrors(
        problems.map((p) =>
          p.code === 'empty' ? t.needLine : p.code === 'qty' ? t.badQty : p.code === 'stock' ? t.overStock : t.badPrice,
        ),
      );
      return;
    }
    setErrors([]);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { sale } = await createSale(quickSaleBody(lines));
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
        <p>{done.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</p>
        <button className="btn btn-solid" type="button" onClick={startAgain}>
          {t.again}
        </button>
      </div>
    );
  }

  return (
    <div>
      <SaleLines
        batteries={batteries}
        lines={lines}
        onLines={(next) => {
          setLines(next);
          setErrors([]);
        }}
        idPrefix="quick"
        capAtStock
        showLineTotals
        searchRef={searchRef}
      />
      {errors.length > 0 && (
        <div role="alert">
          {errors.map((msg, i) => (
            <p key={i} className="admin-ferr">
              {msg}
            </p>
          ))}
        </div>
      )}
      <form onSubmit={(e) => void submit(e)}>
        {showTotal && (
          <p className="admin-total">
            {t.total}: <b>{formatMoney(total)}</b>
          </p>
        )}
        {lines.length === 0 && <p className="admin-hint">{t.pickBatteryFirst}</p>}
        {submitError && <RequestError error={submitError} onSignOut={onSignOut} />}
        <button className="btn btn-solid" type="submit" disabled={submitting || lines.length === 0}>
          {t.saveQuick}
        </button>
      </form>
    </div>
  );
}
