'use client';

import { useState } from 'react';
import { waLink } from '@/lib/site/contact';
import { fill } from '@/lib/i18n/i18n';
import type { SiteContent } from '@/components/site/content';

export default function NotSurePane({ t }: { t: SiteContent['finder'] }) {
  const n = t.notSure;
  const m = t.messages;
  const [phone, setPhone] = useState('');
  const [car, setCar] = useState('');
  const [vin, setVin] = useState('');
  const [note, setNote] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [carError, setCarError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setPhoneError(n.phoneRequired);
      return;
    }
    setPhoneError(null);
    if (!car.trim()) {
      setCarError(n.carRequired);
      return;
    }
    setCarError(null);
    const lines = [
      m.notSureHello,
      fill(m.notSurePhone, { v: phone.trim() }),
      fill(m.notSureCar, { v: car.trim() }),
      vin.trim() ? fill(m.notSureVin, { v: vin.trim() }) : null,
      note.trim() ? fill(m.notSureNote, { v: note.trim() }) : null,
      m.notSurePhoto,
    ].filter((l): l is string => l !== null);
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="ns-phone">
            {n.phone} <span className="req">*</span>
          </label>
          <input
            type="tel"
            id="ns-phone"
            placeholder={n.phonePlaceholder}
            required
            value={phone}
            aria-invalid={phoneError !== null}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError(null);
            }}
          />
          {phoneError && (
            <p className="ferr" role="alert">
              {phoneError}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="ns-car">
            {n.car} <span className="req">*</span>
          </label>
          <input
            type="text"
            id="ns-car"
            placeholder={n.carPlaceholder}
            value={car}
            aria-invalid={carError !== null}
            onChange={(e) => {
              setCar(e.target.value);
              setCarError(null);
            }}
          />
          {carError && (
            <p className="ferr" role="alert">
              {carError}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="ns-vin">{n.vin}</label>
          <input type="text" id="ns-vin" className="code-input" autoComplete="off" value={vin} onChange={(e) => setVin(e.target.value)} />
        </div>
        <div className="field field-full">
          <label htmlFor="ns-note">{n.note}</label>
          <textarea id="ns-note" placeholder={n.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="find-actions">
        <button className="btn btn-solid" type="submit">
          <svg className="ic" aria-hidden="true">
            <use href="#i-send" />
          </svg>
          {n.submit}
        </button>
        <p className="find-hint">{n.hint}</p>
      </div>
    </form>
  );
}
