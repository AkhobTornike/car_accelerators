import { waLink } from '@/lib/site/contact';
import { fill } from '@/lib/i18n/i18n';
import { stockLine } from '@/components/finder/ResultCard';
import BatteryRender from './BatteryRender';
import type { ResultCardStrings, SiteContent } from './content';
import type { PublicBattery } from '@/server/catalog';

function dimsOf(b: PublicBattery): string {
  return `${b.dimsMm.l} × ${b.dimsMm.w} × ${b.dimsMm.h}`;
}

interface Props {
  battery: PublicBattery;
  t: SiteContent['catalog'];
  card: ResultCardStrings;
}

export default function CatalogCard({ battery: b, t, card }: Props) {
  const stock = stockLine(b, card);
  const price = b.price === null ? t.askForPrice : `${b.price} ₾`;
  const askText = fill(t.askMessage, { name: b.name, ah: b.ah, cca: b.cca, price: b.price === null ? t.priceOnRequest : `${b.price} GEL` });
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
          {b.caseCode} · {dimsOf(b)} · {b.warrantyMonths} {t.months}
        </p>
        <div className="pfoot">
          <span className="pprice">
            {price}
          </span>
        </div>
        <div className="pbtns">
          <a className="btn btn-sm btn-wa" target="_blank" rel="noopener" href={waLink(askText)}>
            <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
              <use href="#i-wa" />
            </svg>
            {t.ask}
          </a>
        </div>
      </div>
    </article>
  );
}
