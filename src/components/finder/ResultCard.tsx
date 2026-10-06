'use client';

import type { Note, PublicBattery, Tier } from '@/lib/api-client';
import { telLink, waLink } from '@/lib/site/contact';
import { fill } from '@/lib/i18n/i18n';
import type { ResultCardStrings, SiteContent, StockStrings } from '@/components/site/content';

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

export function stockLine(b: Pick<PublicBattery, 'stock' | 'quantity'>, s: StockStrings): { text: string; ok: boolean } {
  if (b.stock === 'order') return { text: s.stockOrder, ok: false };
  if (b.quantity !== undefined) {
    if (b.quantity <= 0) return { text: s.stockOut, ok: false };
    if (b.quantity <= 3) return { text: fill(s.stockLeft, { n: b.quantity }), ok: true };
    return { text: fill(s.stockCount, { n: b.quantity }), ok: true };
  }
  return b.stock === 'out' ? { text: s.stockOut, ok: false } : { text: s.stockIn, ok: true };
}

function noteText(n: Note, tech: string, c: ResultCardStrings): string | null {
  if (n === 'tech-upgrade') return fill(c.noteTech, { tech });
  if (n === 'higher-capacity') return c.noteCapacity;
  if (n === 'higher-cca') return c.noteCca;
  if (n === 'order-only') return c.noteOrder;
  if (n === 'out-of-stock') return c.noteOut;
  return null;
}

export default function ResultCard({ item, t }: { item: ResultItem; t: SiteContent['finder'] }) {
  const { battery: b, match, vehicle } = item;
  const c = t.results.card;
  const spec = match ? match.spec : `${b.polarity}, ${b.caseCode}, ${b.ah}Ah, ${b.cca}A`;
  const stock = stockLine(b, c);
  const notes = (match?.notes ?? []).map((n) => noteText(n, b.tech, c)).filter((x): x is string => x !== null);
  const askText = fill(t.messages.resultAsk, { name: b.name, ah: b.ah, cca: b.cca, vehicle });
  return (
    <div className="rcard" role="listitem">
      <div className="rbody">
        <div className="rname">
          <h3>{b.name}</h3>
          <span className="tech">{b.tech}</span>
          {match?.tier === 'upgrade' && <span className="upgrade">{c.upgrade}</span>}
        </div>
        <div className="specs">
          <div className="spec">
            <span className="k">{c.spec}</span>
            <span className="dots" aria-hidden="true" />
            <span className="v">{spec}</span>
          </div>
          <div className="spec">
            <span className="k">{c.warranty}</span>
            <span className="dots" aria-hidden="true" />
            <span className="v">
              {b.warrantyMonths} {c.months}
            </span>
          </div>
        </div>
        {notes.length > 0 && (
          <p className="find-hint">
            {c.upgradePrefix}
            {notes.join(' · ')}
          </p>
        )}
      </div>
      <div className="rcard-actions">
        <span className={`pill ${stock.ok ? 'pill-ok' : 'pill-order'}`}>{stock.text}</span>
        <span className="price">{b.price === null ? c.askForPrice : `${b.price} ₾`}</span>
        <a className="btn btn-sm btn-wa" target="_blank" rel="noopener" href={waLink(askText)}>
          <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
            <use href="#i-wa" />
          </svg>
          {c.ask}
        </a>
        <a className="btn btn-sm btn-line" href={telLink()}>
          <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
            <use href="#i-phone" />
          </svg>
          {c.call}
        </a>
      </div>
    </div>
  );
}
