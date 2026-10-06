'use client';

import { useState } from 'react';
import { content } from '@/components/site/content';
import CodePane from './CodePane';
import NotSurePane from './NotSurePane';
import VehiclePane from './VehiclePane';

const METHODS = [
  { id: 'vehicle', label: 'By vehicle', icon: 'i-car' },
  { id: 'code', label: 'By battery code', icon: 'i-search' },
  { id: 'notsure', label: content.finder.notSure.tab, icon: 'i-cam' },
] as const;

type Method = (typeof METHODS)[number]['id'];

function Icons() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-car" viewBox="0 0 24 24">
          <path d="M3 16.8v-2.4l1.7-4.5A2.3 2.3 0 0 1 6.9 8.3h10.2a2.3 2.3 0 0 1 2.2 1.6l1.7 4.5v2.4h-2.2" />
          <path d="M3 16.8h2.6M18.8 16.8H21M8.6 8.3l-.9 6.1M15.4 8.3l.9 6.1" />
          <circle cx="7.5" cy="16.9" r="1.8" />
          <circle cx="16.5" cy="16.9" r="1.8" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="10.8" cy="10.8" r="6.4" />
          <path d="m15.6 15.6 5 5" />
        </symbol>
        <symbol id="i-wa" viewBox="0 0 24 24">
          <path d="M12 3.1a8.4 8.4 0 0 0-7.3 12.6L3.3 20.7l5.1-1.3A8.4 8.4 0 1 0 12 3.1Z" />
          <path d="M9.1 8.3c.5-.9 1.1-.9 1.5-.1l.6 1.1c.2.4-.3 1-.8 1.4.5 1.3 1.6 2.3 2.8 2.8.4-.4 1-1 1.4-.7l1.1.6c.8.4.7 1-.2 1.5-3 1.5-7.9-3.6-6.4-6.6Z" />
        </symbol>
        <symbol id="i-phone" viewBox="0 0 24 24">
          <path d="M7 3.4 9 5.9c.3.4.3 1-.1 1.4L7.6 8.6a12.9 12.9 0 0 0 7.8 7.8l1.3-1.3c.4-.4 1-.5 1.4-.1l2.5 1.9c.5.4.6 1.1.2 1.6l-1.4 1.6c-.5.5-1.2.8-1.9.6C11 19.3 4.7 13 3.4 6.4c-.1-.7.2-1.4.7-1.9l1.5-1.3c.4-.4 1.1-.3 1.4.2Z" />
        </symbol>
        <symbol id="i-info" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.4" />
          <path d="M12 11.2v4.9M12 7.7v.2" />
        </symbol>
        <symbol id="i-cam" viewBox="0 0 24 24">
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.4" />
          <circle cx="12" cy="12" r="3.7" />
          <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-send" viewBox="0 0 24 24">
          <path d="M20.6 3.4 10.8 13.2M20.6 3.4 14.1 20.6l-3.3-7.4-7.4-3.3z" />
        </symbol>
      </defs>
    </svg>
  );
}

export default function Finder() {
  const [method, setMethod] = useState<Method>('vehicle');

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = METHODS.findIndex((m) => m.id === method);
    const dir = e.key === 'ArrowRight' ? 1 : METHODS.length - 1;
    setMethod(METHODS[(i + dir) % METHODS.length].id);
  }

  return (
    <div className="finder-panel">
      <Icons />
      <div className="tabs" role="tablist" aria-label="Search method" onKeyDown={onKey}>
        {METHODS.map((m) => (
          <button
            key={m.id}
            className="tab"
            role="tab"
            type="button"
            id={`tab-${m.id}`}
            aria-controls={`pane-${m.id}`}
            aria-selected={m.id === method}
            tabIndex={m.id === method ? 0 : -1}
            onClick={() => setMethod(m.id)}
          >
            <svg className="ic" aria-hidden="true">
              <use href={`#${m.icon}`} />
            </svg>
            {m.label}
          </button>
        ))}
      </div>
      <div className="tabpanes">
        <div role="tabpanel" id="pane-vehicle" aria-labelledby="tab-vehicle" hidden={method !== 'vehicle'}>
          {method === 'vehicle' && <VehiclePane />}
        </div>
        <div role="tabpanel" id="pane-code" aria-labelledby="tab-code" hidden={method !== 'code'}>
          {method === 'code' && <CodePane />}
        </div>
        <div role="tabpanel" id="pane-notsure" aria-labelledby="tab-notsure" hidden={method !== 'notsure'}>
          {method === 'notsure' && <NotSurePane />}
        </div>
      </div>
    </div>
  );
}
