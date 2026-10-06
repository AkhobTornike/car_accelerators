'use client';

import { useState } from 'react';
import { localeHref } from '@/lib/i18n/i18n';
import type { Locale } from '@/lib/i18n/types';

interface Props {
  links: { label: string; href: string }[];
  label: string;
  switcher: { ka: string; en: string };
  lang: Locale;
}

export default function MobileMenu({ links, label, switcher, lang }: Props) {
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
          <span className="mmenu-switch">
            {(['ka', 'en'] as const).map((l) => (
              <a key={l} href={localeHref(l)} hrefLang={l} lang={l} aria-current={l === lang ? 'page' : undefined}>
                {switcher[l]}
              </a>
            ))}
          </span>
        </nav>
      )}
    </div>
  );
}
