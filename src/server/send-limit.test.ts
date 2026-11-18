import { beforeEach, describe, expect, it } from 'vitest';
import { MANUAL_SENDS_PER_DAY, resetSendLimitForTests, takeManualSlot, tbilisiDay } from './send-limit';

describe('manual summary sends', () => {
  beforeEach(resetSendLimitForTests);
  const noon = new Date('2026-11-18T08:00:00Z');

  it('allows 10 sends a day and refuses the 11th', async () => {
    for (let i = 1; i <= MANUAL_SENDS_PER_DAY; i++) expect(await takeManualSlot(noon, {})).toEqual({ allowed: true, used: i });
    expect(await takeManualSlot(noon, {})).toEqual({ allowed: false, used: MANUAL_SENDS_PER_DAY });
  });
  it('starts a new count on the next Tbilisi day', async () => {
    for (let i = 0; i < MANUAL_SENDS_PER_DAY; i++) await takeManualSlot(noon, {});
    expect((await takeManualSlot(new Date('2026-11-19T08:00:00Z'), {})).allowed).toBe(true);
  });
  it('counts the day in Tbilisi time (UTC+4)', () => {
    expect(tbilisiDay(new Date('2026-11-18T19:59:59Z'))).toBe('2026-11-18');
    expect(tbilisiDay(new Date('2026-11-18T20:00:00Z'))).toBe('2026-11-19');
  });
});
