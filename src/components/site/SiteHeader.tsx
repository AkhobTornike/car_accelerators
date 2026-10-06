import { contact, telLink } from '@/lib/site/contact';
import MobileMenu from './MobileMenu';
import { content } from './content';

export default function SiteHeader() {
  return (
    <header id="top">
      <div className="wrap topbar">
        <a className="brand" href="#top" aria-label={`${content.brand.name}${content.brand.tld} — home`}>
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
        <nav className="mainnav" aria-label="Main">
          {content.nav.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <a className="head-phone" href={telLink()}>
          <svg className="ic" aria-hidden="true">
            <use href="#i-phone" />
          </svg>
          <span>{contact.phoneDisplay}</span>
        </a>
        <MobileMenu links={content.nav} label={content.menu} />
      </div>
    </header>
  );
}
