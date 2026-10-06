import { content } from './content';

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap foot">
        <a className="brand" href="#top" aria-label={`${content.brand.name}${content.brand.tld} — back to top`}>
          <span className="brand-glyph">
            <svg className="ic" aria-hidden="true">
              <use href="#i-batt" />
            </svg>
          </span>
          <span className="brand-name">
            {content.brand.name}
            <em>{content.brand.tld}</em>
          </span>
        </a>
        <p className="small">{content.demoNotice}</p>
        <nav className="foot-nav" aria-label="Footer">
          {content.footer.nav.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
