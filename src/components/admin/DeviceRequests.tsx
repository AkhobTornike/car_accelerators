'use client';

import { useState } from 'react';
import { AdminApiError, decideDevice, type PendingDeviceInfo } from '@/lib/admin-api';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.devices;

/** Devices waiting for approval, shown at the top of the panel to admins on a trusted address. */
export default function DeviceRequests({ devices, onChanged, onSignOut }: { devices: PendingDeviceInfo[]; onChanged: () => void; onSignOut: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);

  async function decide(ip: string, approve: boolean) {
    if (busy) return;
    setBusy(ip);
    setError(null);
    try {
      await decideDevice(ip, approve);
      setNote(approve ? t.approved : t.rejected);
      onChanged();
    } catch (e) {
      setError(e as AdminApiError);
    } finally {
      setBusy(null);
    }
  }

  if (devices.length === 0 && !note) return null;
  return (
    <section className="admin-panel device-requests" aria-live="polite">
      {devices.length > 0 && <h2 className="admin-sub">{t.requestTitle}</h2>}
      {error && <RequestError error={error} onSignOut={onSignOut} />}
      {note && <p className="admin-success" role="status">{note}</p>}
      <ul className="admin-cards">
        {devices.map((d) => (
          <li key={d.ip}>
            <p>
              <b>{t.account}:</b> {d.email ?? '—'} · <b>{t.ip}:</b> <span className="mono">{d.ip}</span>
            </p>
            <div className="admin-row-actions">
              <button className="btn btn-solid btn-sm" type="button" disabled={busy !== null} onClick={() => void decide(d.ip, true)}>
                {t.approve}
              </button>
              <button className="btn btn-line btn-sm" type="button" disabled={busy !== null} onClick={() => void decide(d.ip, false)}>
                {t.reject}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {devices.length > 0 && <p className="admin-hint">{t.rejectHint}</p>}
    </section>
  );
}
