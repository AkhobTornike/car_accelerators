'use client';

import { useEffect, useRef, useState } from 'react';
import { searchByOldCode } from '@/lib/api-client';
import { fill } from '@/lib/i18n/i18n';
import type { SiteContent } from '@/components/site/content';
import Results from './Results';
import type { ResultItem } from './ResultCard';

export default function CodePane({ t }: { t: SiteContent['finder'] }) {
  const [code, setCode] = useState('');
  const [items, setItems] = useState<ResultItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const ctrl = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const lastCode = useRef('');

  useEffect(() => () => ctrl.current?.abort(), []);

  async function search(value: string) {
    lastCode.current = value;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    seq.current += 1;
    const id = seq.current;
    setStatus('loading');
    try {
      const results = await searchByOldCode(value, c.signal);
      if (id !== seq.current) return;
      const vehicle = fill(t.messages.vehicleCode, { code: value });
      setItems(results.map((battery) => ({ battery, match: null, vehicle })));
      setStatus('ready');
    } catch (e) {
      if (id !== seq.current) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setStatus('error');
    }
  }

  const ready = code.trim().length >= 3;
  const c = t.code;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) void search(code.trim());
        }}
      >
        <div className="fields fields-single">
          <div className="field">
            <label htmlFor="f-code">{c.label}</label>
            <input
              className="code-input"
              type="text"
              id="f-code"
              value={code}
              autoComplete="off"
              placeholder={c.placeholder}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </div>
        <div className="find-actions">
          <button className="btn btn-solid" type="submit" disabled={!ready}>
            {c.submit}
          </button>
          <p className="find-hint">{c.hint}</p>
        </div>
      </form>
      <Results status={status} items={items} onRetry={() => void search(lastCode.current)} t={t} />
    </div>
  );
}
