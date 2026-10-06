import { contact, telLink } from '@/lib/site/contact';
import { localeHref } from '@/lib/i18n/i18n';
import type { Locale } from '@/lib/i18n/types';
import MobileMenu from './MobileMenu';
import type { SiteContent } from './content';

export default function SiteHeader({ t, lang }: { t: SiteContent; lang: Locale }) {
  return (
    <header id="top">
      <div className="wrap topbar">
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
        <nav className="mainnav" aria-label={t.navLabel}>
          {t.nav.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="lang-switch" role="group" aria-label={`${t.switcher.ka} / ${t.switcher.en}`}>
          {(['ka', 'en'] as const).map((l) => (
            <a
              key={l}
              href={localeHref(l)}
              hrefLang={l}
              lang={l}
              aria-current={l === lang ? 'page' : undefined}
            >
              {t.switcher[l]}
            </a>
          ))}
        </div>
        <a className="head-phone" href={telLink()}>
          <svg className="ic" aria-hidden="true">
            <use href="#i-phone" />
          </svg>
          <span>{contact.phoneDisplay}</span>
        </a>
        <MobileMenu links={t.nav} label={t.menu} switcher={t.switcher} lang={lang} />
      </div>
    </header>
  );
}
