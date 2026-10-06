import type { SiteContent } from './content';

export default function SiteFooter({ t }: { t: SiteContent }) {
  return (
    <footer>
      <div className="wrap foot">
        <a className="brand" href="#top" aria-label={t.homeLabel.replace('{brand}', `${t.brand.name}${t.brand.tld}`)}>
          <span className="brand-glyph">
            <svg className="ic" aria-hidden="true">
              <use href="#i-batt" />
            </svg>
          </span>
          <span className="brand-name">
            {t.brand.name}
            <em>{t.brand.tld}</em>
          </span>
        </a>
        <p className="small">{t.demoNotice}</p>
        <nav className="foot-nav" aria-label={t.footer.navLabel}>
          {t.footer.nav.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
