'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AdminApiError,
  getShopProfile,
  listBatteries,
  type AdminBattery,
  type Sale,
} from '@/lib/admin-api';
import type { ShopProfile } from '@/server/shop-profile';
import { buildReceiptModel } from '@/lib/receipt';
import RequestError from './RequestError';
import ReceiptDoc, { type DocKind, type DocPaper } from './ReceiptDoc';
import { labels } from './labels';

const t = labels.print;

const DOCS: DocKind[] = ['receipt', 'invoice', 'warranty'];

export default function ReceiptDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [demo, setDemo] = useState(false);
  const [batteries, setBatteries] = useState<AdminBattery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [doc, setDoc] = useState<DocKind>('receipt');
  const [paper, setPaper] = useState<DocPaper>('a4');

  useEffect(() => {
    let live = true;
    Promise.all([getShopProfile(), listBatteries()])
      .then(([shop, stock]) => {
        if (!live) return;
        setProfile(shop.profile);
        setDemo(shop.demo);
        setBatteries(stock.batteries);
        setPaper(shop.profile.paperDefault);
      })
      .catch((e) => {
        if (live) setError(e as AdminApiError);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const body = (
    <div className="print-root">
      {paper === 'thermal80' && doc === 'receipt' && <style>{'@page{size:80mm 297mm;margin:3mm}'}</style>}
      <div className="print-overlay">
        <div className="print-sheet" role="dialog" aria-label={t.action}>
          <div className="segbar no-print" role="group" aria-label={t.action}>
            {DOCS.map((d) => (
              <button
                key={d}
                className="segbtn"
                type="button"
                aria-pressed={doc === d}
                onClick={() => setDoc(d)}
              >
                {d === 'receipt' ? t.receipt : d === 'invoice' ? t.invoice : t.warrantyCard}
              </button>
            ))}
          </div>
          {doc === 'receipt' && (
            <div className="segbar no-print" role="group" aria-label={t.paper}>
              {(['a4', 'thermal80'] as const).map((p) => (
                <button
                  key={p}
                  className="segbtn"
                  type="button"
                  aria-pressed={paper === p}
                  onClick={() => setPaper(p)}
                >
                  {p === 'a4' ? t.paperA4 : t.paperThermal}
                </button>
              ))}
            </div>
          )}
          {loading && <p className="admin-hint no-print">{labels.loading}</p>}
          {error && <RequestError error={error} onRetry={() => window.location.reload()} />}
          {profile && !loading && !error && (
            <ReceiptDoc
              doc={doc}
              paper={doc === 'receipt' ? paper : 'a4'}
              model={buildReceiptModel(sale, profile, batteries)}
              profile={profile}
              demo={demo}
            />
          )}
          <div className="admin-row-actions no-print">
            <button className="btn btn-solid btn-sm" type="button" disabled={loading || !profile} onClick={() => window.print()}>
              {t.action}
            </button>
            <button className="btn btn-line btn-sm" type="button" onClick={onClose}>
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
