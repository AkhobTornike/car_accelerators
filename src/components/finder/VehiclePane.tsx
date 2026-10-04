'use client';

import { useEffect, useRef, useState } from 'react';
import { getEngines, getMakes, getMatches, getModels, type EngineOption, type VehicleType } from '@/lib/api-client';
import Results from './Results';
import type { ResultItem } from './ResultCard';

const TYPES: VehicleType[] = ['car', 'van', 'truck', 'moto'];
const TYPE_LABEL: Record<VehicleType, string> = {
  car: 'Car / SUV',
  van: 'Van / commercial',
  truck: 'Truck / bus',
  moto: 'Motorcycle',
};

function yearOptions(): number[] {
  const out: number[] = [];
  for (let y = new Date().getFullYear(); y >= 1990; y -= 1) out.push(y);
  return out;
}

const YEARS = yearOptions();

export default function VehiclePane() {
  const [types, setTypes] = useState<VehicleType[] | null>(null);
  const [typesFailed, setTypesFailed] = useState(false);
  const [vType, setVType] = useState<VehicleType>('car');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [engine, setEngine] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [engines, setEngines] = useState<EngineOption[]>([]);
  const [loading, setLoading] = useState<'makes' | 'models' | 'engines' | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const ctrl = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const lastMatch = useRef<{ fitmentId: string; label: string } | null>(null);

  useEffect(() => {
    const c = new AbortController();
    ctrl.current = c;
    Promise.all(TYPES.map((t) => getMakes(t, c.signal).catch((): string[] => [])))
      .then((lists) => {
        // An aborted run (React StrictMode mounts effects twice in dev) turns every request into [] via the
        // catch above; it must not report "failed" or it overrides the run that actually succeeds.
        if (c.signal.aborted) return;
        const nonEmpty = TYPES.filter((t, i) => lists[i].length > 0);
        if (nonEmpty.length === 0) {
          setTypesFailed(true);
          return;
        }
        setTypesFailed(false);
        setTypes(nonEmpty);
        setVType(nonEmpty[0]);
        setMakes(lists[TYPES.indexOf(nonEmpty[0])]);
      })
      .catch(() => {
        if (!c.signal.aborted) setTypesFailed(true);
      });
    return () => c.abort();
  }, []);

  function next(): { id: number; signal: AbortSignal } {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    seq.current += 1;
    return { id: seq.current, signal: c.signal };
  }
  function alive(id: number): boolean {
    return id === seq.current;
  }
  function aborted(e: unknown): boolean {
    return e instanceof DOMException && e.name === 'AbortError';
  }

  async function pickType(t: VehicleType) {
    const { id, signal } = next();
    setVType(t);
    setMake('');
    setModel('');
    setEngine('');
    setModels([]);
    setEngines([]);
    setItems([]);
    setStatus('idle');
    setLoadFailed(false);
    setLoading('makes');
    try {
      const list = await getMakes(t, signal);
      if (!alive(id)) return;
      setMakes(list);
    } catch (e) {
      if (!alive(id) || aborted(e)) return;
      setLoadFailed(true);
    } finally {
      if (alive(id)) setLoading(null);
    }
  }

  async function pickMake(t: VehicleType, value: string) {
    const { id, signal } = next();
    setMake(value);
    setModel('');
    setEngine('');
    setEngines([]);
    setItems([]);
    setStatus('idle');
    setLoadFailed(false);
    if (!value) {
      setModels([]);
      return;
    }
    setLoading('models');
    try {
      const list = await getModels(t, value, signal);
      if (!alive(id)) return;
      setModels(list);
    } catch (e) {
      if (!alive(id) || aborted(e)) return;
      setLoadFailed(true);
    } finally {
      if (alive(id)) setLoading(null);
    }
  }

  async function loadEngines(t: VehicleType, makeValue: string, modelValue: string, yearValue: string) {
    const { id, signal } = next();
    setEngine('');
    setItems([]);
    setStatus('idle');
    setLoadFailed(false);
    if (!modelValue) {
      setEngines([]);
      return;
    }
    setLoading('engines');
    try {
      const list = await getEngines(t, makeValue, modelValue, yearValue ? Number(yearValue) : undefined, signal);
      if (!alive(id)) return;
      setEngines(list);
    } catch (e) {
      if (!alive(id) || aborted(e)) return;
      setLoadFailed(true);
    } finally {
      if (alive(id)) setLoading(null);
    }
  }

  async function showMatches(fitmentId: string, label: string) {
    lastMatch.current = { fitmentId, label };
    const { id, signal } = next();
    setStatus('loading');
    try {
      const results = await getMatches(fitmentId, signal);
      if (!alive(id)) return;
      const vehicle = `${year ? `${year} ` : ''}${make} ${model} · ${label}`;
      setItems(
        results.map((b) => ({ battery: b, match: { tier: b.tier, spec: b.spec, notes: b.notes }, vehicle })),
      );
      setStatus('ready');
    } catch (e) {
      if (!alive(id) || aborted(e)) return;
      setStatus('error');
    }
  }

  function retryMatches() {
    const last = lastMatch.current;
    if (last) void showMatches(last.fitmentId, last.label);
  }

  function onTabKey(e: React.KeyboardEvent) {
    if (!types || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    const i = types.indexOf(vType);
    const dir = e.key === 'ArrowRight' ? 1 : types.length - 1;
    void pickType(types[(i + dir) % types.length]);
  }

  if (typesFailed) {
    return (
      <div className="empty" role="alert">
        <b>Something went wrong, please try again.</b>{' '}
        <button className="btn btn-sm btn-line" type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }
  if (types === null) return <p className="find-hint">Loading…</p>;

  return (
    <div>
      <div className="tabs subtabs" role="tablist" aria-label="Vehicle type" onKeyDown={onTabKey}>
        {types.map((t) => (
          <button
            key={t}
            className="tab"
            role="tab"
            type="button"
            aria-selected={t === vType}
            tabIndex={t === vType ? 0 : -1}
            onClick={() => void pickType(t)}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="fields">
        <div className="field">
          <label htmlFor="f-year">Year</label>
          <select
            id="f-year"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (make && model) void loadEngines(vType, make, model, e.target.value);
            }}
          >
            <option value="">Year…</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-make">Make</label>
          <select id="f-make" value={make} onChange={(e) => void pickMake(vType, e.target.value)}>
            <option value="">{loading === 'makes' ? 'Loading…' : 'Make…'}</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-model">Model</label>
          <select
            id="f-model"
            value={model}
            disabled={!make}
            onChange={(e) => {
              setModel(e.target.value);
              void loadEngines(vType, make, e.target.value, year);
            }}
          >
            <option value="">{loading === 'models' ? 'Loading…' : '—'}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-eng">Engine / fuel</label>
          <select
            id="f-eng"
            value={engine}
            disabled={!model}
            onChange={(e) => {
              setEngine(e.target.value);
              const found = engines.find((x) => x.fitmentId === e.target.value);
              if (found) void showMatches(found.fitmentId, found.label);
            }}
          >
            <option value="">{loading === 'engines' ? 'Loading…' : '—'}</option>
            {engines.map((x) => (
              <option key={x.fitmentId} value={x.fitmentId}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loadFailed && (
        <p className="ferr" role="alert">
          Something went wrong, please try again.
        </p>
      )}
      <Results status={status} items={items} onRetry={retryMatches} />
    </div>
  );
}
