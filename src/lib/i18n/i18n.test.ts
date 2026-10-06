import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { buildJsonLd } from '@/lib/site/json-ld';
import { deepKeys, fill, getContent, localeHref, parseLocale } from './i18n';
import { defaultLocale, locales } from './types';

describe('locales', () => {
  it('parses and validates locale values', () => {
    expect(parseLocale('ka')).toBe('ka');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('xx')).toBeNull();
    expect(parseLocale('')).toBeNull();
    expect(parseLocale(undefined)).toBeNull();
    expect(parseLocale(null)).toBeNull();
    expect(parseLocale(123)).toBeNull();
  });
  it('declares ka default', () => {
    expect(locales).toEqual(['ka', 'en']);
    expect(defaultLocale).toBe('ka');
  });
  it('maps switcher hrefs', () => {
    expect(localeHref('ka')).toBe('/');
    expect(localeHref('en')).toBe('/en');
  });
});

describe('dictionaries', () => {
  it('getContent returns each locale', () => {
    expect(getContent('ka').finder.heading).toBe(getContent('ka').finder.heading);
    expect(getContent('en').hero.titleA).toBe('Right battery.');
  });
  it('ka and en have the identical key structure', () => {
    const ka = getContent('ka');
    const en = getContent('en');
    expect(deepKeys(ka).sort()).toEqual(deepKeys(en).sort());
  });
});

describe('fill', () => {
  it('replaces placeholders', () => {
    expect(fill('Hello {name}, {n} left', { name: 'S60', n: 2 })).toBe('Hello S60, 2 left');
    expect(fill('Only {n} left', {})).toBe('Only {n} left');
    expect(fill('no placeholders', { a: 1 })).toBe('no placeholders');
  });
});

describe('sitemap alternates', () => {
  it('lists both URLs with language alternates', () => {
    const urls = sitemap();
    expect(urls.map((u) => u.url)).toEqual([expect.stringMatching(/\/$/), expect.stringMatching(/\/en$/)]);
    for (const u of urls) {
      expect(u.alternates?.languages?.ka).toMatch(/\/$/);
      expect(u.alternates?.languages?.en).toMatch(/\/en$/);
    }
  });
});

describe('JSON-LD language', () => {
  it('emits inLanguage and a localised description', () => {
    const doc = buildJsonLd(
      'https://amper.ge',
      { phoneDisplay: 'p', address: 'a', hours: 'h', email: 'e' },
      [],
      { inLanguage: 'ka', description: 'ქართული აღწერა' },
    );
    const business = (doc['@graph'] as Record<string, unknown>[])[0];
    expect(business).toMatchObject({ inLanguage: 'ka', description: 'ქართული აღწერა' });
  });
});
