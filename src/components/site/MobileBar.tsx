import { telLink, waLink } from '@/lib/site/contact';
import type { SiteContent } from './content';

export default function MobileBar({ t, quoteMessage }: { t: SiteContent['mbar']; quoteMessage: string }) {
  return (
    <div className="mbar" role="navigation" aria-label={t.navLabel}>
      <a className="btn btn-wa" href={waLink(quoteMessage)} target="_blank" rel="noopener">
        <svg className="ic" aria-hidden="true">
          <use href="#i-wa" />
        </svg>
        {t.whatsapp}
      </a>
      <a className="btn btn-solid" href={telLink()}>
        <svg className="ic" aria-hidden="true">
          <use href="#i-phone" />
        </svg>
        {t.call}
      </a>
    </div>
  );
}
