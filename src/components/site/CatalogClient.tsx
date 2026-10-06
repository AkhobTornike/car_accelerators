'use client';

import { useState } from 'react';
import { filterCatalog, type CatalogChip } from '@/lib/site/catalog-filter';
import CatalogCard from './CatalogCard';
import { content } from './content';
import type { PublicBattery } from '@/server/catalog';

export default function CatalogClient({ batteries }: { batteries: PublicBattery[] }) {
  const [chip, setChip] = useState<CatalogChip>('all');
  const visible = filterCatalog(batteries, chip);
  return (
    <div>
      <div className="cat-head">
        <div>
          <p className="eyebrow">{content.catalog.eyebrow}</p>
          <h2 className="h2" id="cat-h">
            {content.catalog.heading}
          </h2>
        </div>
        <div className="chipbar" role="group" aria-label="Filter">
          {content.catalog.chips.map((ch) => (
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
        <p className="empty">{content.catalog.empty}</p>
      ) : (
        <div className="grid-products">
          {visible.map((b) => (
            <CatalogCard key={b.id} battery={b} />
          ))}
        </div>
      )}
    </div>
  );
}
