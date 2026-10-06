import { content } from './content';

const t = content.tech;

function Gauge({ cycles }: { cycles: number }) {
  return (
    <div className="gauge">
      <div className="glabel">
        <span>Cycle life</span>
        <span className="mono">{cycles} / 12</span>
      </div>
      <div className="cells">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} className={i < cycles ? 'on' : undefined} />
        ))}
      </div>
    </div>
  );
}

function AnatomyFigure() {
  const f = t.figure;
  return (
    <div className="anat-fig" role="img" aria-label={f.label}>
      <svg viewBox="0 0 520 350" style={{ display: 'block', width: '100%' }}>
        <rect x="96" y="54" width="30" height="26" rx="3" fill="var(--amber-soft)" stroke="var(--amber)" strokeWidth="1.5" />
        <text x="111" y="73" textAnchor="middle" fontFamily="var(--mono)" fontSize="17" fontWeight="600" fill="var(--amber-ink)">+</text>
        <rect x="306" y="54" width="30" height="26" rx="3" fill="var(--bg-4)" stroke="var(--line-2)" strokeWidth="1.5" />
        <text x="321" y="73" textAnchor="middle" fontFamily="var(--mono)" fontSize="17" fill="var(--ink-2)">−</text>
        <text x="140" y="72" fontFamily="var(--mono)" fontSize="10" letterSpacing="1.5" fill="var(--ink-3)">{f.polarity}</text>
        <rect x="60" y="80" width="312" height="228" rx="7" fill="var(--bg-3)" stroke="var(--line-2)" strokeWidth="1.5" />
        <rect x="60" y="80" width="312" height="38" rx="7" fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth="1.5" />
        <rect x="188" y="92" width="56" height="11" rx="5" fill="none" stroke="var(--line-2)" strokeWidth="1.5" />
        <rect x="88" y="150" width="256" height="132" rx="4" fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth="1.5" />
        <rect x="88" y="150" width="256" height="7" rx="2" fill="var(--amber)" />
        <text x="104" y="192" fontFamily="var(--disp)" fontWeight="700" fontSize="27" letterSpacing="1" fill="var(--ink)">{f.brand}</text>
        <text x="104" y="222" fontFamily="var(--mono)" fontSize="15" fill="var(--ink-2)">{f.spec} <tspan fill="var(--ink)" fontWeight="600">{f.specAh}</tspan> {f.specCca} <tspan fill="var(--ink)" fontWeight="600">{f.specDin}</tspan></text>
        <text x="104" y="246" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-3)">{f.dims}</text>
        <g fill="var(--ink-3)">
          <circle cx="108" cy="264" r="3.4" /><circle cx="120" cy="264" r="3.4" /><circle cx="132" cy="264" r="3.4" />
          <circle cx="108" cy="276" r="3.4" fill="var(--amber)" /><circle cx="120" cy="276" r="3.4" /><circle cx="132" cy="276" r="3.4" />
        </g>
        <text x="146" y="268" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{f.dateCode}</text>
        <circle cx="316" cy="270" r="6" fill="var(--ok)" opacity=".9" />
        <text x="252" y="274" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{f.stateEye}</text>
        <g fontFamily="var(--mono)" fontSize="12" fontWeight="600" textAnchor="middle">
          <circle cx="212" cy="217" r="10" fill="var(--bg)" stroke="var(--amber)" strokeWidth="1.5" /><text x="212" y="221.5" fill="var(--amber)">1</text>
          <circle cx="288" cy="217" r="10" fill="var(--bg)" stroke="var(--amber)" strokeWidth="1.5" /><text x="288" y="221.5" fill="var(--amber)">2</text>
          <circle cx="88" cy="270" r="10" fill="var(--bg)" stroke="var(--amber)" strokeWidth="1.5" /><text x="88" y="274.5" fill="var(--amber)">3</text>
          <circle cx="111" cy="40" r="10" fill="var(--bg)" stroke="var(--amber)" strokeWidth="1.5" /><text x="111" y="44.5" fill="var(--amber)">4</text>
        </g>
      </svg>
    </div>
  );
}

export default function Tech() {
  return (
    <section id="tech" aria-labelledby="tech-h">
      <div className="wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 className="h2" id="tech-h">
          {t.heading}
        </h2>
        <div className="tech-grid">
          {t.columns.map((c) => (
            <article key={c.name} className={c.name === 'AGM' ? 'tcol hot' : 'tcol'}>
              <div className="tbig">
                {c.name} <small>{c.full}</small>
              </div>
              <p>{c.text}</p>
              <Gauge cycles={c.cycles} />
              <p className={c.verdictOk ? 'verdict yes' : 'verdict no'}>
                <svg className="ic" aria-hidden="true">
                  <use href={c.verdictOk ? '#i-check' : '#i-x'} />
                </svg>
                {c.verdict}
              </p>
            </article>
          ))}
        </div>
        <p className="ss-note">
          <svg className="ic" aria-hidden="true">
            <use href="#i-bolt" />
          </svg>
          <span>
            <b>{t.startStopTitle}</b> {t.startStopText}
          </span>
        </p>
        <div className="anatomy">
          <AnatomyFigure />
          <div>
            <p className="eyebrow">{t.anatomyEyebrow}</p>
            <h3 className="h3">{t.anatomyHeading}</h3>
            <ul className="anat-list">
              {t.anatomy.map((a, i) => (
                <li key={a.title}>
                  <span className="anat-n">{i + 1}</span>
                  <div>
                    <b>{a.title}</b>
                    <p>{a.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="small">{t.photoHint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
