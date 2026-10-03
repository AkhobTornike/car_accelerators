'use client';

import { useEffect, useRef, useState } from 'react';
import { searchByOldCode } from '@/lib/api-client';
import Results from './Results';
import type { ResultItem } from './ResultCard';

export default function CodePane() {
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
      const vehicle = `battery code ${value}`;
      setItems(results.map((battery) => ({ battery, match: null, vehicle })));
      setStatus('ready');
    } catch (e) {
      if (id !== seq.current) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setStatus('error');
    }
  }

  const ready = code.trim().length >= 3;

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
            <label htmlFor="f-code">Code, OEM number, group size, Ah or CCA</label>
            <input
              className="code-input"
              type="text"
              id="f-code"
              value={code}
              autoComplete="off"
              placeholder="e.g. 0 092 S50 080 · L3 · 60Ah · 540A"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </div>
        <div className="find-actions">
          <button className="btn btn-solid" type="submit" disabled={!ready}>
            Find equivalents
          </button>
          <p className="find-hint">At least 3 characters — the code printed on the old battery label.</p>
        </div>
      </form>
      <Results status={status} items={items} onRetry={() => void search(lastCode.current)} />
    </div>
  );
}
