import { getPublicCatalog } from '@/server/catalog';
import CatalogClient from './CatalogClient';
import { content } from './content';

export default async function Catalog() {
  const batteries = await getPublicCatalog();
  return (
    <section id="catalog" aria-labelledby="cat-h">
      <div className="wrap">
        {batteries.length === 0 ? <p className="empty">{content.catalog.empty}</p> : <CatalogClient batteries={batteries} />}
        <p className="find-note">
          <svg className="ic" aria-hidden="true">
            <use href="#i-tag" />
          </svg>
          <span>{content.catalog.note}</span>
        </p>
      </div>
    </section>
  );
}
