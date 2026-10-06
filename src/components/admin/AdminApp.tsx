'use client';

import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase-client';
import ExportPanel from './ExportPanel';
import NewSale from './NewSale';
import SalesList from './SalesList';
import StockTable from './StockTable';
import { labels } from './labels';

type Tab = 'sales' | 'new' | 'stock' | 'export';

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('new');

  useEffect(() => onAuthStateChanged(getFirebaseAuth(), setUser), []);

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

  return (
    <div>
      <div className="admin-bar">
        <span className="admin-user">{user.email}</span>
        <button className="btn btn-line btn-sm" type="button" onClick={() => void signOutNow()}>
          {labels.signOut}
        </button>
      </div>
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
