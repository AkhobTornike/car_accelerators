'use client';

import { waLink } from '@/lib/site/contact';
import type { SiteContent } from '@/components/site/content';
import ResultCard, { type ResultItem } from './ResultCard';

interface Props {
  status: 'idle' | 'loading' | 'error' | 'ready';
  items: ResultItem[];
  onRetry: () => void;
  t: SiteContent['finder'];
}

export default function Results({ status, items, onRetry, t }: Props) {
  const r = t.results;
  if (status === 'idle') return null;
  return (
    <div className="results" role="list" aria-live="polite">
      {status === 'loading' && <p className="find-hint">{r.loading}</p>}
      {status === 'error' && (
        <div className="empty" role="alert">
          <b>{r.error}</b>{' '}
          <button className="btn btn-sm btn-line" type="button" onClick={onRetry}>
            {r.retry}
          </button>
        </div>
      )}
      {status === 'ready' && items.length === 0 && (
        <div className="empty">
          <b>{r.emptyTitle}</b> — {r.emptyText}{' '}
          <a className="btn btn-sm btn-wa" target="_blank" rel="noopener" href={waLink(t.messages.emptyMatch)}>
            {r.whatsapp}
          </a>
        </div>
      )}
      {status === 'ready' && items.map((item) => <ResultCard key={item.battery.id} item={item} t={t} />)}
    </div>
  );
}
