import { describe, expect, it } from 'vitest';
import robots from './robots';

describe('robots.txt', () => {
  it('blocks the API but never names the admin prefix', () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules.disallow).toEqual(['/api/']);
    expect(JSON.stringify(r)).not.toContain('/m/');
  });
  it('points to the sitemap on SITE_URL', () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
