'use client';

import { useState } from 'react';

export default function MobileMenu({ links, label }: { links: { label: string; href: string }[]; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mmenu">
      <button
        className="btn btn-line btn-sm mmenu-btn"
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="ic" aria-hidden="true" style={{ width: 16, height: 16 }}>
          <use href={open ? '#i-x' : '#i-plus'} />
        </svg>
      </button>
      {open && (
        <nav className="mmenu-nav" aria-label={label}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
