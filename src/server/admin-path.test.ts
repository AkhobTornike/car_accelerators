import { describe, expect, it } from 'vitest';
import { currentAdminSegment, isoWeekKey, rotates, validAdminSegments } from './admin-path';

describe('isoWeekKey', () => {
  it('numbers ISO weeks (Monday start, Thursday decides the year)', () => {
    expect(isoWeekKey(new Date('2026-11-18T10:00:00Z'))).toBe('2026-W47');
    expect(isoWeekKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
    expect(isoWeekKey(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
    expect(isoWeekKey(new Date('2026-11-22T23:59:59Z'))).toBe('2026-W47'); // Sunday
    expect(isoWeekKey(new Date('2026-11-23T00:00:00Z'))).toBe('2026-W48'); // Monday
  });
});

describe('validAdminSegments', () => {
  const now = new Date('2026-11-18T10:00:00Z');
  it('uses the fixed ADMIN_PATH when rotation is switched off', () => {
    expect(validAdminSegments({ ADMIN_PATH: 'abc', ADMIN_PATH_ROTATE: 'off' }, now)).toEqual(['abc']);
    expect(rotates({ ADMIN_PATH: 'abc', ADMIN_PATH_ROTATE: 'off' })).toBe(false);
  });
  it('rotates weekly by default', () => {
    expect(rotates({ ADMIN_PATH: 'abc' })).toBe(true);
    expect(validAdminSegments({ ADMIN_PATH: 'abc' }, now)).toHaveLength(2);
    expect(validAdminSegments({ ADMIN_PATH: 'abc' }, now)).not.toContain('abc');
  });
  it('is off without ADMIN_PATH', () => {
    expect(validAdminSegments({}, now)).toEqual([]);
    expect(currentAdminSegment({}, now)).toBeNull();
    expect(rotates({ ADMIN_PATH_ROTATE: 'weekly' })).toBe(false);
  });
  it('rotates weekly: current + previous week, never the base value', () => {
    const env = { ADMIN_PATH: 'abc' };
    const [cur, prev] = validAdminSegments(env, now);
    expect(cur).toMatch(/^[0-9a-f]{24}$/);
    expect(prev).not.toBe(cur);
    expect(validAdminSegments(env, now)).not.toContain('abc');
    expect(currentAdminSegment(env, now)).toBe(cur);
    // next week: last week's current segment is now the "previous" one
    const next = validAdminSegments(env, new Date('2026-11-25T10:00:00Z'));
    expect(next[1]).toBe(cur);
    expect(next[0]).not.toBe(cur);
  });
  it('differs per secret', () => {
    const a = validAdminSegments({ ADMIN_PATH: 'a' }, now)[0];
    const b = validAdminSegments({ ADMIN_PATH: 'b' }, now)[0];
    expect(a).not.toBe(b);
  });
});
