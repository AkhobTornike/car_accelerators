import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validAdminSegments } from './admin-path';
import { getAdminEpoch, resetSecurityStateForTests } from './security-state';

const calls: string[] = [];
const sendMail = vi.hoisted(() => vi.fn());
const revoke = vi.hoisted(() => vi.fn());
vi.mock('./email', () => ({ sendMail }));
vi.mock('./revoke-sessions', () => ({ revokeAdminSessions: revoke }));
vi.mock('./repository', () => ({
  getInventory: () => ({ listSales: async () => ({ sales: [], voids: [] }) }),
  getRepository: () => ({ listBatteries: async () => [] }),
}));

import { sendWeeklySummary } from './weekly-summary';

beforeEach(() => {
  calls.length = 0;
  resetSecurityStateForTests();
  sendMail.mockReset();
  revoke.mockReset();
  sendMail.mockImplementation(async () => void calls.push('mail'));
  revoke.mockImplementation(async () => void calls.push('revoke'));
  vi.stubEnv('ADMIN_PATH', 'abc');
  vi.stubEnv('SITE_URL', 'https://ampera.ge');
  vi.stubEnv('DATA_BACKEND', '');
});

describe('sendWeeklySummary with rotate', () => {
  it('emails the NEW link first, then kills the old ones and signs everyone out', async () => {
    const now = new Date('2026-11-18T10:00:00Z');
    const oldLink = validAdminSegments(process.env, now, 0)[0];
    const newLink = validAdminSegments(process.env, now, 1)[0];
    await sendWeeklySummary(now, { rotate: true });
    expect(sendMail.mock.calls[0][0].text).toContain(`https://ampera.ge/m/${newLink}/`);
    expect(sendMail.mock.calls[0][0].text).not.toContain(oldLink);
    expect(calls).toEqual(['mail', 'revoke']);
    expect(await getAdminEpoch(now.getTime(), true)).toBe(1);
  });
  it('a failing email changes nothing: the old link keeps working', async () => {
    sendMail.mockRejectedValue(new Error('resend down'));
    await expect(sendWeeklySummary(new Date('2026-11-18T10:00:00Z'), { rotate: true })).rejects.toThrow();
    expect(revoke).not.toHaveBeenCalled();
    expect(await getAdminEpoch(Date.now(), true)).toBe(0);
  });
  it('the weekly cron does not rotate', async () => {
    await sendWeeklySummary(new Date('2026-11-18T10:00:00Z'));
    expect(revoke).not.toHaveBeenCalled();
    expect(await getAdminEpoch(Date.now(), true)).toBe(0);
  });
});
