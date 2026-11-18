import { describe, expect, it } from 'vitest';
import { getSiteUrl } from './site-url';

describe('getSiteUrl', () => {
  it('prefers SITE_URL and strips trailing slashes', () => {
    expect(getSiteUrl({ SITE_URL: 'https://ampera.ge/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })).toBe('https://ampera.ge');
  });
  it('falls back to the Vercel production domain', () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'ampera-ge.vercel.app' })).toBe('https://ampera-ge.vercel.app');
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'https://ampera-ge.vercel.app/' })).toBe('https://ampera-ge.vercel.app');
  });
  it('uses localhost only when nothing else is known', () => {
    expect(getSiteUrl({})).toBe('http://localhost:3000');
    expect(getSiteUrl({ SITE_URL: '  ' })).toBe('http://localhost:3000');
  });
});
