import Image from 'next/image';
import { telLink, waLink } from '@/lib/site/contact';
import type { SiteContent } from './content';

const FACT_ICONS = ['#i-shield', '#i-check', '#i-truck'];

export default function Hero({ t, quoteMessage }: { t: SiteContent['hero']; quoteMessage: string }) {
  return (
    <section className="hero" aria-labelledby="hero-h">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 id="hero-h">
            {t.titleA} <em>{t.titleB}</em>
          </h1>
          <p className="lede">{t.lede}</p>
          <div className="hero-cta">
            <a className="btn btn-solid" href={waLink(quoteMessage)} target="_blank" rel="noopener">
              <svg className="ic" aria-hidden="true">
                <use href="#i-wa" />
              </svg>
              {t.whatsapp}
            </a>
            <a className="btn btn-line" href={telLink()}>
              <svg className="ic" aria-hidden="true">
                <use href="#i-phone" />
              </svg>
              {t.call}
            </a>
          </div>
          <ul className="hero-facts">
            {t.facts.map((f, i) => (
              <li key={f}>
                <svg className="ic" aria-hidden="true">
                  <use href={FACT_ICONS[i] ?? '#i-check'} />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <figure className="hero-photo">
          <div className="frame">
            <Image src="/images/hero.jpg" alt={t.photoAlt} width={1100} height={734} priority />
            <figcaption className="photo-tag">
              <b>{t.photoModel}</b> · {t.photoTag}
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
