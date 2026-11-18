import { describe, expect, it } from 'vitest';
import { eventForHref, parseGaId, track } from './analytics';

describe('parseGaId', () => {
  it('accepts a GA4 measurement id and rejects anything else', () => {
    expect(parseGaId('G-ABC123XYZ9')).toBe('G-ABC123XYZ9');
    expect(parseGaId(' G-ABC123XYZ9 ')).toBe('G-ABC123XYZ9');
    for (const bad of [undefined, '', 'UA-12345-1', 'GTM-ABC123', 'G-', "G-AB'];alert(1)//", 'g-abc123xyz9']) expect(parseGaId(bad)).toBeNull();
  });
});

describe('eventForHref', () => {
  it('maps the shop contact channels to events', () => {
    expect(eventForHref('tel:+995322550011')).toBe('click_phone');
    expect(eventForHref('mailto:hello@amper.ge')).toBe('click_email');
    expect(eventForHref('https://wa.me/995555123456?text=Hi')).toBe('click_whatsapp');
    expect(eventForHref('https://t.me/amperge')).toBe('click_telegram');
    expect(eventForHref('https://fb.com/amperge')).toBe('click_facebook');
    expect(eventForHref('https://instagram.com/amper.ge')).toBe('click_instagram');
  });
  it('ignores every other link', () => {
    expect(eventForHref('#faq')).toBeNull();
    expect(eventForHref('/en')).toBeNull();
    expect(eventForHref('https://example.com/wa.me/')).toBeNull();
  });
});

describe('track', () => {
  it('does nothing without window/gtag', () => {
    expect(() => track('x')).not.toThrow();
  });
});
