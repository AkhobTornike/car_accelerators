import { formatMoney } from '@/lib/admin-api';
import type { ReceiptModel } from '@/lib/receipt';
import type { ShopProfile } from '@/server/shop-profile';
import { labels } from './labels';

const t = labels.print;
const pay = labels.newSale;

function payLabel(method: string): string {
  if (method === 'transfer') return pay.transfer;
  if (method === 'card') return pay.card;
  return pay.cash;
}

function DemoBanner({ demo }: { demo: boolean }) {
  if (!demo) return null;
  return <p className="doc-banner">{t.demoBanner}</p>;
}

function Totals({ model, profile }: { model: ReceiptModel; profile: ShopProfile }) {
  return (
    <div className="doc-totals">
      {model.discount > 0 && (
        <p>
          {t.discount}: <b>−{formatMoney(model.discount)}</b>
        </p>
      )}
      {profile.vatPayer && (
        <>
          <p>
            {t.netLine}: <b>{formatMoney(model.net)}</b>
          </p>
          <p>
            {t.vatLine}: <b>{formatMoney(model.vat)}</b>
          </p>
        </>
      )}
      <p className="doc-grand">
        {t.total}: <b>{formatMoney(model.total)}</b>
      </p>
      <p>
        {t.payment}: {payLabel(model.paymentMethod)}
      </p>
    </div>
  );
}

function Footer({ profile }: { profile: ShopProfile }) {
  return (
    <>
      {profile.returnsText && <p className="doc-note">{profile.returnsText}</p>}
      {profile.footerText && <p className="doc-foot">{profile.footerText}</p>}
    </>
  );
}

function BuyerBlock({ model }: { model: ReceiptModel }) {
  if (!model.customer) return null;
  return (
    <div className="doc-block">
      <b>{t.buyer}</b>
      <p>{model.customer.name}</p>
      {model.customer.idKind === 'idNumber' && (
        <p>
          {t.idNumber}: {model.customer.idValue}
        </p>
      )}
      {model.customer.idKind === 'iban' && (
        <p>
          {t.iban}: {model.customer.idValue}
        </p>
      )}
    </div>
  );
}

function ReceiptA4({ model, profile, demo }: { model: ReceiptModel; profile: ShopProfile; demo: boolean }) {
  return (
    <div className="doc doc-a4">
      <DemoBanner demo={demo} />
      <div className="doc-head">
        <b>{profile.brand}</b>
        <span>
          № {model.number} · {model.dateDisplay}
        </span>
      </div>
      <h2>{t.receipt}</h2>
      <table className="doc-table">
        <thead>
          <tr>
            <th>{t.item}</th>
            <th>{t.qty}</th>
            <th>{t.unit}</th>
            <th>{t.sum}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.name}</td>
              <td>{l.qty}</td>
              <td>{formatMoney(l.unitPrice)}</td>
              <td>{formatMoney(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Totals model={model} profile={profile} />
      <Footer profile={profile} />
    </div>
  );
}

function ReceiptThermal({ model, profile, demo }: { model: ReceiptModel; profile: ShopProfile; demo: boolean }) {
  return (
    <div className="doc doc-thermal">
      <DemoBanner demo={demo} />
      <b>{profile.brand}</b>
      <p>
        № {model.number}
        <br />
        {model.dateDisplay}
      </p>
      <h2>{t.receipt}</h2>
      {model.lines.map((l, i) => (
        <p key={i}>
          {l.name}
          <br />
          {l.qty} × {formatMoney(l.unitPrice)} = {formatMoney(l.total)}
        </p>
      ))}
      <Totals model={model} profile={profile} />
      <Footer profile={profile} />
    </div>
  );
}

function Invoice({ model, profile, demo }: { model: ReceiptModel; profile: ShopProfile; demo: boolean }) {
  return (
    <div className="doc doc-a4">
      <DemoBanner demo={demo} />
      <div className="doc-head">
        <b>{profile.brand}</b>
        <span>
          № {model.number} · {model.dateDisplay}
        </span>
      </div>
      <h2>{t.invoice}</h2>
      <div className="doc-cols">
        <BuyerBlock model={model} />
        <div className="doc-block">
          <b>{t.seller}</b>
          <p>{profile.legalName}</p>
          <p>
            {t.taxId}: {profile.taxId}
          </p>
          <p>
            {t.address}: {profile.address}
          </p>
          <p>
            {t.phone}: {profile.phone}
          </p>
          {profile.iban && (
            <p>
              {t.iban}: {profile.iban}
            </p>
          )}
        </div>
      </div>
      <table className="doc-table">
        <thead>
          <tr>
            <th>{t.item}</th>
            <th>{t.qty}</th>
            <th>{t.unit}</th>
            <th>{t.sum}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.name}</td>
              <td>{l.qty}</td>
              <td>{formatMoney(l.unitPrice)}</td>
              <td>{formatMoney(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Totals model={model} profile={profile} />
      <div className="doc-signs">
        <span>{t.buyerSign}</span>
        <span>{t.sellerSign}</span>
      </div>
      <Footer profile={profile} />
    </div>
  );
}

function Warranty({ model, profile, demo }: { model: ReceiptModel; profile: ShopProfile; demo: boolean }) {
  return (
    <div className="doc doc-a4 doc-half">
      <DemoBanner demo={demo} />
      <div className="doc-head">
        <b>{profile.brand}</b>
        <span>
          № {model.number} · {model.dateDisplay}
        </span>
      </div>
      <h2>{t.warrantyCard}</h2>
      {model.warranty.map((w, i) => (
        <div key={i} className="doc-block">
          <b>{w.name}</b>
          {(w.ah !== null || w.cca !== null) && (
            <p>
              {w.ah !== null && `${w.ah}Ah `}
              {w.cca !== null && `${w.cca}A`}
            </p>
          )}
          {w.warrantyMonths !== null && w.endDate && (
            <p>
              {t.date}: {model.dateDisplay} · {w.warrantyMonths} {t.months} → {t.warrantyUntil} {w.endDate}
            </p>
          )}
        </div>
      ))}
      <p className="doc-note">{profile.warrantyText}</p>
      <div className="doc-signs">
        <span>{t.buyerSign}</span>
        <span>{t.sellerSign}</span>
      </div>
      <Footer profile={profile} />
    </div>
  );
}

export type DocKind = 'receipt' | 'invoice' | 'warranty';
export type DocPaper = 'a4' | 'thermal80';

interface Props {
  doc: DocKind;
  paper: DocPaper;
  model: ReceiptModel;
  profile: ShopProfile;
  demo: boolean;
}

export default function ReceiptDoc({ doc, paper, model, profile, demo }: Props) {
  if (doc === 'invoice') return <Invoice model={model} profile={profile} demo={demo} />;
  if (doc === 'warranty') return <Warranty model={model} profile={profile} demo={demo} />;
  if (paper === 'thermal80') return <ReceiptThermal model={model} profile={profile} demo={demo} />;
  return <ReceiptA4 model={model} profile={profile} demo={demo} />;
}
