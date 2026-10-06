'use client';

import { useState } from 'react';
import { AdminApiError, downloadExport, type ExportKind } from '@/lib/admin-api';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.exportPanel;

export default function ExportPanel({ onSignOut }: { onSignOut: () => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);

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
    </div>
  );
}
