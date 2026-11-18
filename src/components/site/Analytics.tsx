'use client';

import Script from 'next/script';
import { useEffect, useSyncExternalStore } from 'react';
import { CONSENT_KEY, eventForHref, track, type ConsentChoice } from '@/lib/analytics';

type Gtag = (...args: unknown[]) => void;

interface Props {
  id: string;
  t: { text: string; accept: string; decline: string };
}

const CONSENT_EVENT = 'amper-consent-change';
type Snapshot = ConsentChoice | 'none' | 'pending';

// Used when localStorage is blocked, so the banner can still be dismissed for this page view.
let memoryChoice: ConsentChoice | null = null;

function readChoice(): Snapshot {
  if (memoryChoice) return memoryChoice;
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : 'none';
  } catch {
    return 'none';
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Google Analytics 4 with Consent Mode v2: everything starts "denied" (no analytics cookies), and only an explicit
 * "accept" on the banner switches analytics storage on. The choice is remembered in localStorage.
 * Rendered only when NEXT_PUBLIC_GA_ID is set (see layout).
 */
export default function Analytics({ id, t }: Props) {
  // 'pending' on the server and during hydration, so the banner never flashes for a visitor who already chose.
  const choice = useSyncExternalStore(subscribe, readChoice, (): Snapshot => 'pending');
  const askUser = choice === 'none';

  useEffect(() => {
    if (choice === 'granted' || choice === 'denied') (window as unknown as { gtag?: Gtag }).gtag?.('consent', 'update', { analytics_storage: choice });
  }, [choice]);

  // One delegated listener: counts clicks on the shop's contact links (WhatsApp, phone, Telegram, e-mail, social).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      const href = a?.getAttribute('href');
      const event = href ? eventForHref(href) : null;
      if (event) track(event);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function choose(next: ConsentChoice) {
    try {
      window.localStorage.setItem(CONSENT_KEY, next);
    } catch {
      memoryChoice = next; // private mode: not remembered across visits
    }
    (window as unknown as { gtag?: Gtag }).gtag?.('consent', 'update', { analytics_storage: next });
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
gtag('js',new Date());gtag('config','${id}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      {askUser && (
        <div className="consent" role="region" aria-label="Cookies">
          <p>{t.text}</p>
          <div className="consent-btns">
            <button type="button" className="btn btn-line btn-sm" onClick={() => choose('denied')}>
              {t.decline}
            </button>
            <button type="button" className="btn btn-solid btn-sm" onClick={() => choose('granted')}>
              {t.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
