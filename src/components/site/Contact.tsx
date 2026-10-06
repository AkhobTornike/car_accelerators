'use client';

import { useState } from 'react';
import { contact, telLink, waLink } from '@/lib/site/contact';
import { content } from './content';

const c = content.contact;

const CHANNEL_ICONS: Record<string, string> = { WhatsApp: '#i-wa', Call: '#i-phone', Telegram: '#i-send', Email: '#i-mail' };

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={copied ? 'copy copied' : 'copy'}
      type="button"
      aria-label={label}
      onClick={() => {
        const done = () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        };
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done, done);
        else done();
      }}
    >
      <svg className="ic" aria-hidden="true">
        <use href="#i-copy" />
      </svg>
    </button>
  );
}

function QuoteForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [battery, setBattery] = useState('');
  const [channel, setChannel] = useState(c.channels[0]);
  const [note, setNote] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(c.nameRequired);
      return;
    }
    setNameError(null);
    if (!phone.trim()) {
      setPhoneError(c.phoneRequired);
      return;
    }
    setPhoneError(null);
    const lines = [
      `Hello, I would like a battery quote.`,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      vehicle.trim() ? `Vehicle: ${vehicle.trim()}` : null,
      battery.trim() ? `Battery/code: ${battery.trim()}` : null,
      `Preferred channel: ${channel}`,
      note.trim() ? `Note: ${note.trim()}` : null,
    ].filter((l): l is string => l !== null);
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  }

  return (
    <form className="qform" onSubmit={submit} noValidate>
      <div className="row">
        <div className="field">
          <label htmlFor="q-name">
            {c.name} <span className="req">*</span>
          </label>
          <input
            type="text"
            id="q-name"
            autoComplete="name"
            required
            value={name}
            aria-invalid={nameError !== null}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
          />
          {nameError && (
            <p className="ferr" role="alert">
              {nameError}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="q-phone">
            {c.phone} <span className="req">*</span>
          </label>
          <input
            type="tel"
            id="q-phone"
            autoComplete="tel"
            placeholder={c.phonePlaceholder}
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
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="q-veh">{c.vehicle}</label>
          <input type="text" id="q-veh" placeholder={c.vehiclePlaceholder} value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="q-prod">{c.battery}</label>
          <input className="code-input" type="text" id="q-prod" placeholder={c.batteryPlaceholder} value={battery} onChange={(e) => setBattery(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label id="q-chan-label">{c.channel}</label>
        <div className="chan-pick" role="radiogroup" aria-labelledby="q-chan-label">
          {c.channels.map((ch, i) => (
            <span key={ch}>
              <input type="radio" name="q-chan" id={`qc-${i}`} value={ch} checked={channel === ch} onChange={() => setChannel(ch)} />
              <label htmlFor={`qc-${i}`}>
                <svg className="ic" style={{ width: 14, height: 14 }} aria-hidden="true">
                  <use href={CHANNEL_ICONS[ch] ?? '#i-msg'} />
                </svg>
                {ch}
              </label>
            </span>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="q-note">{c.note}</label>
        <textarea id="q-note" placeholder={c.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="find-actions">
        <button className="btn btn-solid" type="submit">
          <svg className="ic" aria-hidden="true">
            <use href="#i-send" />
          </svg>
          {c.submit}
        </button>
        <p className="find-hint">{c.hint}</p>
      </div>
    </form>
  );
}

export default function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-h">
      <div className="wrap">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 className="h2" id="contact-h">
          {c.heading}
        </h2>
        <div className="contact-grid">
          <QuoteForm />
          <div className="chan-grid">
            <a className="chan wa" href={waLink('Hello, I need a car battery. Please send me a quote.')} target="_blank" rel="noopener">
              <span className="cic">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-wa" />
                </svg>
              </span>
              <span className="ct">
                <b>{c.whatsappTitle}</b>
                <span>{contact.whatsappDisplay}</span>
              </span>
            </a>
            <a className="chan" href={telLink()}>
              <span className="cic">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-phone" />
                </svg>
              </span>
              <span className="ct">
                <b>{c.counterTitle}</b>
                <span>{contact.phoneDisplay}</span>
              </span>
            </a>
            <div className="chan">
              <span className="cic">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-send" />
                </svg>
              </span>
              <span className="ct">
                <b>{c.telegramTitle}</b>
                <span>
                  <a href={contact.telegram} target="_blank" rel="noopener">
                    {contact.telegramHandle}
                  </a>
                </span>
              </span>
              <CopyButton value={contact.telegramHandle} label={c.copyTelegram} />
            </div>
            <div className="chan">
              <span className="cic">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-mail" />
                </svg>
              </span>
              <span className="ct">
                <b>{c.emailTitle}</b>
                <span>{contact.email}</span>
              </span>
              <CopyButton value={contact.email} label={c.copyEmail} />
            </div>
            <a className="chan" href={contact.facebook} target="_blank" rel="noopener">
              <span className="cic">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-msg" />
                </svg>
              </span>
              <span className="ct">
                <b>{c.facebookTitle}</b>
                <span>fb.com/amperge</span>
              </span>
            </a>
            <a className="chan" href={contact.instagram} target="_blank" rel="noopener">
              <span className="cic">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-cam" />
                </svg>
              </span>
              <span className="ct">
                <b>{c.instagramTitle}</b>
                <span>@amper.ge</span>
              </span>
            </a>
            <div className="hours">
              <svg className="ic" aria-hidden="true">
                <use href="#i-clock" />
              </svg>
              <span>
                {c.hoursPrefix} <span className="mono">{c.hoursDays}</span>
                {c.hoursMid}
                <br />
                {c.hoursWarehouse} <span className="mono">{c.hoursAddress}</span> {c.hoursSuffix}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
