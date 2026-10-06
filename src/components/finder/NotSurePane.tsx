'use client';

import { useState } from 'react';
import { waLink } from '@/lib/site/contact';
import { content } from '@/components/site/content';

const t = content.finder.notSure;

export default function NotSurePane() {
  const [phone, setPhone] = useState('');
  const [car, setCar] = useState('');
  const [vin, setVin] = useState('');
  const [note, setNote] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [carError, setCarError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setPhoneError(t.phoneRequired);
      return;
    }
    setPhoneError(null);
    if (!car.trim()) {
      setCarError(t.carRequired);
      return;
    }
    setCarError(null);
    const lines = [
      'Hello, I am not sure which battery I need.',
      `Phone: ${phone.trim()}`,
      `Car: ${car.trim()}`,
      vin.trim() ? `VIN: ${vin.trim()}` : null,
      note.trim() ? `What happened: ${note.trim()}` : null,
      'I will attach a photo of the old battery here.',
    ].filter((l): l is string => l !== null);
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="ns-phone">
            {t.phone} <span className="req">*</span>
          </label>
          <input
            type="tel"
            id="ns-phone"
            placeholder={t.phonePlaceholder}
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
            {t.car} <span className="req">*</span>
          </label>
          <input
            type="text"
            id="ns-car"
            placeholder={t.carPlaceholder}
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
          <label htmlFor="ns-vin">{t.vin}</label>
          <input type="text" id="ns-vin" className="code-input" autoComplete="off" value={vin} onChange={(e) => setVin(e.target.value)} />
        </div>
        <div className="field field-full">
          <label htmlFor="ns-note">{t.note}</label>
          <textarea id="ns-note" placeholder={t.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="find-actions">
        <button className="btn btn-solid" type="submit">
          <svg className="ic" aria-hidden="true">
            <use href="#i-send" />
          </svg>
          {t.submit}
        </button>
        <p className="find-hint">{t.hint}</p>
      </div>
    </form>
  );
}
