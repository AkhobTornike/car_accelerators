import { waLink } from '@/lib/site/contact';
import { stockLine } from '@/components/finder/ResultCard';
import BatteryRender from './BatteryRender';
import { content } from './content';
import type { PublicBattery } from '@/server/catalog';

const c = content.catalog;

function dimsOf(b: PublicBattery): string {
  return `${b.dimsMm.l} × ${b.dimsMm.w} × ${b.dimsMm.h}`;
}

function waText(b: PublicBattery): string {
  const price = b.price === null ? 'price on request' : `${b.price} GEL`;
  return `Hello, I am interested in ${b.name} (${b.ah}Ah ${b.cca}A, ${price}). Please confirm availability, price, warranty and installation/delivery options.`;
}

export default function CatalogCard({ battery: b }: { battery: PublicBattery }) {
  const stock = stockLine(b);
  return (
    <article className="pcard">
      <div className="prender">
        <BatteryRender name={b.name} voltage={12} ah={b.ah} tech={b.tech} stock={b.stock} caseCode={b.caseCode} />
      </div>
      <div className="pbody">
        <div className="toprow">
          <span className="tech">{b.tech}</span>
          <span className={`pill ${stock.ok ? 'pill-ok' : 'pill-order'}`}>{stock.text}</span>
        </div>
        <h3 className="pname">{b.name}</h3>
        <p className="pspec">
          <b>12V</b> · <b>{b.ah}Ah</b> · <b>{b.cca}A</b>
          <br />
          {b.caseCode} · {dimsOf(b)} · {b.warrantyMonths} {c.months}
        </p>
        <div className="pfoot">
          <span className="pprice">
            <small>{c.from}</small>
            {b.price === null ? c.askForPrice : `${b.price} ₾`}
          </span>
        </div>
        <div className="pbtns">
          <a className="btn btn-sm btn-wa" target="_blank" rel="noopener" href={waLink(waText(b))}>
            <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
              <use href="#i-wa" />
            </svg>
            {c.ask}
          </a>
        </div>
      </div>
    </article>
  );
}
