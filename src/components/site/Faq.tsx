import type { SiteContent } from './content';

export default function Faq({ t: f }: { t: SiteContent['faq'] }) {

  return (
    <section id="faq" aria-labelledby="faq-h">
      <div className="wrap faq">
        <p className="eyebrow">{f.eyebrow}</p>
        <h2 className="h2" id="faq-h">
          {f.heading}
        </h2>
        {f.items.map((item) => (
          <details key={item.q}>
            <summary>
              {item.q}
              <svg className="ic" aria-hidden="true">
                <use href="#i-plus" />
              </svg>
            </summary>
            <div className="a">
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
