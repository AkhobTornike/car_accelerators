'use client';

import { waLink } from '@/lib/site/contact';
import ResultCard, { type ResultItem } from './ResultCard';

interface Props {
  status: 'idle' | 'loading' | 'error' | 'ready';
  items: ResultItem[];
  onRetry: () => void;
}

export default function Results({ status, items, onRetry }: Props) {
  if (status === 'idle') return null;
  return (
    <div className="results" role="list" aria-live="polite">
      {status === 'loading' && <p className="find-hint">Loading…</p>}
      {status === 'error' && (
        <div className="empty" role="alert">
          <b>Something went wrong, please try again.</b>{' '}
          <button className="btn btn-sm btn-line" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {status === 'ready' && items.length === 0 && (
        <div className="empty">
          <b>No match found</b> — send us a photo of the old battery on WhatsApp.{' '}
          <a
            className="btn btn-sm btn-wa"
            target="_blank"
            rel="noopener"
            href={waLink('Hello, I could not find a battery match. I am sending a photo of the old battery label.')}
          >
            WhatsApp
          </a>
        </div>
      )}
      {status === 'ready' && items.map((item) => <ResultCard key={item.battery.id} item={item} />)}
    </div>
  );
}
