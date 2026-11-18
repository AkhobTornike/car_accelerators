'use client';

import { useCallback, useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getSecurityStatus, type SecurityStatus } from '@/lib/admin-api';
import { getFirebaseAuth } from '@/lib/firebase-client';
import DeviceRequests from './DeviceRequests';
import ExportPanel from './ExportPanel';
import NewSale from './NewSale';
import SalesList from './SalesList';
import StockTable from './StockTable';
import { labels } from './labels';

type Tab = 'sales' | 'new' | 'stock' | 'export';

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('new');
  const [security, setSecurity] = useState<SecurityStatus | null>(null);

  useEffect(() => onAuthStateChanged(getFirebaseAuth(), setUser), []);

  // Every few seconds ask the server about this session: still valid? is this device trusted? who is waiting for approval?
  // A 401 means the link was rotated (or the login revoked): sign out and reload, the old address then answers 404.
  const refresh = useCallback(() => {
    getSecurityStatus()
      .then(setSecurity)
      .catch((e: { status?: number }) => {
        if (e?.status === 401) void signOut(getFirebaseAuth()).finally(() => window.location.reload());
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [user, refresh]);

  async function signIn() {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }

  async function signOutNow() {
    await signOut(getFirebaseAuth());
  }

  if (!user) {
    return (
      <div className="admin-login">
        <p className="eyebrow">{labels.shopName}</p>
        <h1 className="h2">{labels.loginTitle}</h1>
        <p className="admin-hint">{labels.loginText}</p>
        <button className="btn btn-solid" type="button" onClick={() => void signIn()}>
          {labels.loginButton}
        </button>
      </div>
    );
  }

  const status = user ? security : null; // a signed-out page keeps no status
  if (status?.device === 'pending') {
    return (
      <div className="admin-login">
        <p className="eyebrow">{labels.shopName}</p>
        <h1 className="h2">{labels.devices.pendingTitle}</h1>
        <p className="admin-hint">{labels.devices.pendingText}</p>
        <p className="admin-user">{user.email}</p>
        <button className="btn btn-line btn-sm" type="button" onClick={() => void signOutNow()}>
          {labels.signOut}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-bar">
        <span className="admin-user">{user.email}</span>
        <button className="btn btn-line btn-sm" type="button" onClick={() => void signOutNow()}>
          {labels.signOut}
        </button>
      </div>
      <DeviceRequests devices={status?.pending ?? []} onChanged={refresh} onSignOut={() => void signOutNow()} />
      <div className="tabs" role="tablist" aria-label={labels.adminTitle}>
        {(['sales', 'new', 'stock', 'export'] as const).map((t) => (
          <button
            key={t}
            className="tab"
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {labels.tabs[t === 'new' ? 'newSale' : t]}
          </button>
        ))}
      </div>
      <div className="tabpanes" aria-live="polite">
        {tab === 'sales' && <SalesList onSignOut={() => void signOutNow()} />}
        {tab === 'new' && <NewSale onSignOut={() => void signOutNow()} />}
        {tab === 'stock' && <StockTable onSignOut={() => void signOutNow()} />}
        {tab === 'export' && <ExportPanel onSignOut={() => void signOutNow()} />}
      </div>
    </div>
  );
}
