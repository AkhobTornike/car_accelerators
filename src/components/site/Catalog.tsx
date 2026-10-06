import { getPublicCatalog } from '@/server/catalog';
import CatalogClient from './CatalogClient';
import type { SiteContent } from './content';

export default async function Catalog({ t }: { t: SiteContent }) {
  const batteries = await getPublicCatalog();
  return (
    <section id="catalog" aria-labelledby="cat-h">
      <div className="wrap">
        {batteries.length === 0 ? (
          <p className="empty">{t.catalog.empty}</p>
        ) : (
          <CatalogClient batteries={batteries} t={t.catalog} card={t.finder.results.card} />
        )}
        <p className="find-note">
          <svg className="ic" aria-hidden="true">
            <use href="#i-tag" />
          </svg>
          <span>{t.catalog.note}</span>
        </p>
      </div>
    </section>
  );
}
