'use client';

import { useState } from 'react';
import { AdminApiError, downloadExport, sendWeeklySummaryNow, type ExportKind } from '@/lib/admin-api';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.exportPanel;

export default function ExportPanel({ onSignOut }: { onSignOut: () => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [mailError, setMailError] = useState<AdminApiError | null>(null);

  async function sendSummary() {
    if (mail === 'sending') return;
    setMail('sending');
    setMailError(null);
    try {
      await sendWeeklySummaryNow();
      setMail('sent');
    } catch (e) {
      setMailError(e as AdminApiError);
      setMail('idle');
    }
  }

  async function run(kind: ExportKind) {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const { blob, filename } = await downloadExport(kind, from || undefined, to || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e as AdminApiError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="admin-grid">
        <div className="field">
          <label htmlFor="exp-from">{labels.sales.from}</label>
          <input type="date" id="exp-from" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="exp-to">{labels.sales.to}</label>
          <input type="date" id="exp-to" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <p className="admin-hint">{t.hint}</p>
      {error && <RequestError error={error} onSignOut={onSignOut} />}
      <div className="admin-row-actions">
        {(['sales', 'stock', 'movements'] as const).map((k) => (
          <button key={k} className="btn btn-solid" type="button" disabled={busy !== null} onClick={() => void run(k)}>
            {busy === k ? labels.loading : t[k]}
          </button>
        ))}
      </div>
      <h3 className="admin-sub">{t.mailTitle}</h3>
      <p className="admin-hint">{t.mailHint}</p>
      {mailError &&
        (mailError.code === 'too_many_summaries' ? (
          <div className="admin-error" role="alert">
            <p>{t.mailLimit}</p>
          </div>
        ) : mailError.code === 'mail_not_configured' ? (
          <div className="admin-error" role="alert">
            <p>{t.mailNotConfigured.replace('{missing}', mailError.details.join(', '))}</p>
          </div>
        ) : (
          <RequestError error={mailError} onSignOut={onSignOut} />
        ))}
      {mail === 'sent' && (
        <p className="admin-success" role="status">
          {t.mailSent}
        </p>
      )}
      <div className="admin-row-actions">
        <button className="btn btn-solid" type="button" disabled={mail === 'sending'} onClick={() => void sendSummary()}>
          {mail === 'sending' ? t.mailSending : t.mailSend}
        </button>
      </div>
    </div>
  );
}
