'use client';

import { useState } from 'react';
import { filterCatalog, type CatalogChip } from '@/lib/site/catalog-filter';
import CatalogCard from './CatalogCard';
import type { ResultCardStrings, SiteContent } from './content';
import type { PublicBattery } from '@/server/catalog';

interface Props {
  batteries: PublicBattery[];
  t: SiteContent['catalog'];
  card: ResultCardStrings;
}

export default function CatalogClient({ batteries, t, card }: Props) {
  const [chip, setChip] = useState<CatalogChip>('all');
  const visible = filterCatalog(batteries, chip);
  return (
    <div>
      <div className="cat-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 className="h2" id="cat-h">
            {t.heading}
          </h2>
        </div>
        <div className="chipbar" role="group" aria-label={t.filterLabel}>
          {t.chips.map((ch) => (
            <button
              key={ch.id}
              className="mchip"
              type="button"
              aria-pressed={chip === ch.id}
              onClick={() => setChip(ch.id as CatalogChip)}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="empty">{t.empty}</p>
      ) : (
        <div className="grid-products">
          {visible.map((b) => (
            <CatalogCard key={b.id} battery={b} t={t} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
