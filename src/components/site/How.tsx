import { content } from './content';

const h = content.how;

export default function How() {
  return (
    <section id="how" aria-labelledby="how-h">
      <div className="wrap">
        <p className="eyebrow">{h.eyebrow}</p>
        <h2 className="h2" id="how-h">
          {h.heading}
        </h2>
        <div className="how-grid">
          {h.steps.map((s) => (
            <div key={s.n} className="how">
              <span className="how-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
