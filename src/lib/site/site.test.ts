import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterCatalog } from './catalog-filter';
import { contact, telLink, waLink } from './contact';
import { availabilityOf, buildJsonLd, serializeJsonLd } from './json-ld';

describe('contact', () => {
  it('builds wa.me links with encoded text', () => {
    expect(waLink('Hello S60 (60Ah)')).toBe(`https://wa.me/${contact.whatsapp}?text=Hello%20S60%20(60Ah)`);
    expect(waLink('გამარჯობა 3 series')).toContain(encodeURIComponent('გამარჯობა 3 series'));
  });
  it('builds tel links', () => {
    expect(telLink()).toBe(`tel:${contact.phone}`);
  });
  it('falls back to demo numbers without env', async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SHOP_PHONE;
    delete process.env.NEXT_PUBLIC_SHOP_WHATSAPP;
    delete process.env.NEXT_PUBLIC_SHOP_EMAIL;
    const m = await import('./contact');
    expect(m.contact.phone).toBe('+995322550011');
    expect(m.contact.whatsapp).toBe('995555123456');
    expect(m.contact.email).toBe('hello@amper.ge');
    expect(m.contact.address).toBe('12 Kakheti Highway, Tbilisi');
    expect(m.contact.hours).toBe('Mo-Sa 09:00-19:00');
  });
  it('prefers env values when set', async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SHOP_PHONE = '+111';
    process.env.NEXT_PUBLIC_SHOP_WHATSAPP = '111';
    process.env.NEXT_PUBLIC_SHOP_EMAIL = 'a@b.ge';
    const m = await import('./contact');
    expect(m.contact.phone).toBe('+111');
    expect(m.waLink('x')).toBe('https://wa.me/111?text=x');
    delete process.env.NEXT_PUBLIC_SHOP_PHONE;
    delete process.env.NEXT_PUBLIC_SHOP_WHATSAPP;
    delete process.env.NEXT_PUBLIC_SHOP_EMAIL;
  });
  afterEach(() => {
    vi.resetModules();
  });
});

describe('json-ld', () => {
  const contactInfo = { phoneDisplay: '+995 32 255 00 11', address: '12 Kakheti Highway, Tbilisi', hours: 'Mo-Sa 09:00-19:00', email: 'hello@amper.ge' };
  it('emits LocalBusiness plus one Product per battery', () => {
    const doc = buildJsonLd('https://amper.ge', contactInfo, [{ id: 's60', name: 'AMPER S60', price: 215, stock: 'in' }]);
    const graph = doc['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({ '@type': 'LocalBusiness', name: 'AMPER.GE' });
    expect(graph[1]).toMatchObject({
      '@type': 'Product',
      name: 'AMPER S60',
      offers: { '@type': 'Offer', priceCurrency: 'GEL', price: 215, availability: 'https://schema.org/InStock' },
    });
  });
  it('omits offers when price is null', () => {
    const doc = buildJsonLd('https://amper.ge', contactInfo, [{ id: 's60', name: 'AMPER S60', price: null, stock: 'in' }]);
    expect((doc['@graph'] as Record<string, unknown>[])[1]).not.toHaveProperty('offers');
  });
  it('maps availability from stock', () => {
    expect(availabilityOf('in')).toBe('https://schema.org/InStock');
    expect(availabilityOf('order')).toBe('https://schema.org/PreOrder');
    expect(availabilityOf('out')).toBe('https://schema.org/OutOfStock');
  });
  it('escapes < so data cannot close the script tag', () => {
    const s = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(s).not.toContain('<');
    expect(s).toContain('\\u003c/script>');
    expect(() => JSON.parse(s)).not.toThrow();
  });
});

describe('catalog filter', () => {
  const items = [
    { id: 'a', segment: 'car', tech: 'SMF' },
    { id: 'b', segment: 'car', tech: 'AGM' },
    { id: 'c', segment: 'truck', tech: 'SMF' },
    { id: 'd', segment: 'moto', tech: 'AGM' },
    { id: 'e', segment: 'deep', tech: 'DEEP-CYCLE' },
  ];
  it('all, segments and techs', () => {
    expect(filterCatalog(items, 'all').map((b) => b.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(filterCatalog(items, 'car').map((b) => b.id)).toEqual(['a', 'b']);
    expect(filterCatalog(items, 'truck').map((b) => b.id)).toEqual(['c']);
    expect(filterCatalog(items, 'moto').map((b) => b.id)).toEqual(['d']);
    expect(filterCatalog(items, 'deep').map((b) => b.id)).toEqual(['e']);
    expect(filterCatalog(items, 'SMF').map((b) => b.id)).toEqual(['a', 'c']);
    expect(filterCatalog(items, 'EFB')).toEqual([]);
    expect(filterCatalog(items, 'AGM').map((b) => b.id)).toEqual(['b', 'd']);
  });
});
