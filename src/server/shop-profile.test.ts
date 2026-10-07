import { describe, expect, it } from 'vitest';
import { DEMO_PROFILE, getShopProfile } from './shop-profile';

const valid = { ...DEMO_PROFILE, legalName: 'შპს Test', taxId: '123456789', vatPayer: true, paperDefault: 'thermal80' };

describe('getShopProfile', () => {
  it('falls back to the demo profile when unset', () => {
    expect(getShopProfile(undefined)).toEqual({ profile: DEMO_PROFILE, demo: true });
  });
  it('reads a valid JSON profile', () => {
    const r = getShopProfile(JSON.stringify(valid));
    expect(r.demo).toBe(false);
    expect(r.profile.legalName).toBe('შპს Test');
    expect(r.profile.paperDefault).toBe('thermal80');
  });
  it('falls back on broken JSON or a missing required field', () => {
    expect(getShopProfile('{nope').demo).toBe(true);
    const missing: Record<string, unknown> = { ...valid };
    delete missing.warrantyText;
    expect(getShopProfile(JSON.stringify(missing)).demo).toBe(true);
  });
});
