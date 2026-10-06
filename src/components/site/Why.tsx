import Image from 'next/image';
import type { SiteContent } from './content';

export default function Why({ t: w }: { t: SiteContent['why'] }) {
  const ICONS = ['#i-batt', '#i-wrench', '#i-shield', '#i-tag'];

  return (
    <section id="why" aria-labelledby="why-h">
      <div className="wrap">
        <div className="why-grid">
          <div>
            <p className="eyebrow">{w.eyebrow}</p>
            <h2 className="h2" id="why-h">
              {w.heading}
            </h2>
            <ul className="why-list">
              {w.items.map((item, i) => (
                <li key={item.title}>
                  <span className="why-ic">
                    <svg className="ic" aria-hidden="true">
                      <use href={ICONS[i] ?? '#i-batt'} />
                    </svg>
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <figure className="why-photo">
            <Image src="/images/workshop.jpg" alt={w.photoAlt} width={820} height={1230} />
            <figcaption>{w.photoCaption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
