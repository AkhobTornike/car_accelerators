// Google Analytics 4 helpers. Analytics is OFF unless NEXT_PUBLIC_GA_ID holds a valid measurement id (G-XXXXXXXXXX).
export const GA_ID_PATTERN = /^G-[A-Z0-9]{6,}$/;

export function parseGaId(raw: string | undefined | null): string | null {
  const id = raw?.trim();
  return id && GA_ID_PATTERN.test(id) ? id : null;
}

export const CONSENT_KEY = 'amper-analytics-consent';
export type ConsentChoice = 'granted' | 'denied';

type Gtag = (...args: unknown[]) => void;

/** Sends a GA4 event; does nothing when analytics is off or blocked. */
export function track(name: string, params: Record<string, string | number | boolean> = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === 'function') gtag('event', name, params);
}

/** Which GA4 event a clicked link stands for (the shop's contact channels), or null for any other link. */
export function eventForHref(href: string): string | null {
  const h = href.toLowerCase();
  if (h.startsWith('tel:')) return 'click_phone';
  if (h.startsWith('mailto:')) return 'click_email';
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//.test(h)) return 'click_whatsapp';
  if (/^https?:\/\/(t\.me|telegram\.me)\//.test(h)) return 'click_telegram';
  if (/^https?:\/\/([a-z]+\.)?(facebook\.com|fb\.com|fb\.me)\//.test(h)) return 'click_facebook';
  if (/^https?:\/\/([a-z]+\.)?instagram\.com\//.test(h)) return 'click_instagram';
  return null;
}
