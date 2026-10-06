'use client';

import type { Note, PublicBattery, Tier } from '@/lib/api-client';
import { telLink, waLink } from '@/lib/site/contact';

export interface MatchInfo {
  tier: Tier;
  spec: string;
  notes: Note[];
}

export interface ResultItem {
  battery: PublicBattery;
  match: MatchInfo | null;
  vehicle: string;
}

function waText(name: string, ah: number, cca: number, vehicle: string): string {
  return (
    `Hello, I am interested in ${name} (${ah}Ah ${cca}A). My vehicle is: ${vehicle}. ` +
    'Please confirm compatibility, availability, price, warranty and installation/delivery options.'
  );
}

export function stockLine(b: PublicBattery): { text: string; ok: boolean } {
  if (b.stock === 'order') return { text: 'Order only', ok: false };
  if (b.quantity !== undefined) {
    if (b.quantity <= 0) return { text: 'Out of stock', ok: false };
    if (b.quantity <= 3) return { text: `Only ${b.quantity} left`, ok: true };
    return { text: `${b.quantity} in stock`, ok: true };
  }
  return b.stock === 'out' ? { text: 'Out of stock', ok: false } : { text: 'In stock', ok: true };
}

function noteText(n: Note, tech: string): string | null {
  if (n === 'tech-upgrade') return `better technology (${tech})`;
  if (n === 'higher-capacity') return 'more capacity';
  if (n === 'higher-cca') return 'stronger cold start';
  if (n === 'order-only') return 'order only';
  if (n === 'out-of-stock') return 'out of stock';
  return null;
}

export default function ResultCard({ item }: { item: ResultItem }) {
  const { battery: b, match, vehicle } = item;
  const spec = match ? match.spec : `${b.polarity}, ${b.caseCode}, ${b.ah}Ah, ${b.cca}A`;
  const stock = stockLine(b);
  const notes = (match?.notes ?? []).map((n) => noteText(n, b.tech)).filter((t): t is string => t !== null);
  return (
    <div className="rcard" role="listitem">
      <div className="rbody">
        <div className="rname">
          <h3>{b.name}</h3>
          <span className="tech">{b.tech}</span>
          {match?.tier === 'upgrade' && <span className="upgrade">Upgrade</span>}
        </div>
        <div className="specs">
          <div className="spec">
            <span className="k">Spec</span>
            <span className="dots" aria-hidden="true" />
            <span className="v">{spec}</span>
          </div>
          <div className="spec">
            <span className="k">Warranty</span>
            <span className="dots" aria-hidden="true" />
            <span className="v">{b.warrantyMonths} months</span>
          </div>
        </div>
        {notes.length > 0 && <p className="find-hint">Upgrade: {notes.join(' · ')}</p>}
      </div>
      <div className="rcard-actions">
        <span className={`pill ${stock.ok ? 'pill-ok' : 'pill-order'}`}>{stock.text}</span>
        <span className="price">
          {b.price === null ? 'Ask for price' : `${b.price} ₾`}
        </span>
        <a className="btn btn-sm btn-wa" target="_blank" rel="noopener" href={waLink(waText(b.name, b.ah, b.cca, vehicle))}>
          <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
            <use href="#i-wa" />
          </svg>
          Ask
        </a>
        <a className="btn btn-sm btn-line" href={telLink()}>
          <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
            <use href="#i-phone" />
          </svg>
          Call
        </a>
      </div>
    </div>
  );
}
