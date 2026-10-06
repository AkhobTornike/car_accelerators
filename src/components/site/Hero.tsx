import Image from 'next/image';
import { telLink, waLink } from '@/lib/site/contact';
import { content } from './content';

const h = content.hero;

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-h">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{h.eyebrow}</p>
          <h1 id="hero-h">
            {h.titleA} <em>{h.titleB}</em>
          </h1>
          <p className="lede">{h.lede}</p>
          <div className="hero-cta">
            <a className="btn btn-solid" href={waLink('Hello, I need a car battery. Please send me a quote.')} target="_blank" rel="noopener">
              <svg className="ic" aria-hidden="true">
                <use href="#i-wa" />
              </svg>
              {h.whatsapp}
            </a>
            <a className="btn btn-line" href={telLink()}>
              <svg className="ic" aria-hidden="true">
                <use href="#i-phone" />
              </svg>
              {h.call}
            </a>
          </div>
          <ul className="hero-facts">
            {h.facts.map((f, i) => (
              <li key={f}>
                <svg className="ic" aria-hidden="true">
                  <use href={['#i-shield', '#i-check', '#i-truck'][i] ?? '#i-check'} />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <figure className="hero-photo">
          <div className="frame">
            <Image src="/images/hero.jpg" alt={h.photoAlt} width={1100} height={734} priority />
            <figcaption className="photo-tag">
              <b>{h.photoModel}</b> · {h.photoTag}
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
