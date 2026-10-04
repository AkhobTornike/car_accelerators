import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdmin, resetAdminAuthForTests, setIdTokenVerifierForTests } from './admin-auth';

const bearer = (token: string, ip = '9.9.9.9') =>
  new Request('http://localhost/api/admin/sales', { headers: { Authorization: `Bearer ${token}`, 'x-forwarded-for': ip } });
const status = async (token: string, ip?: string) => (await requireAdmin(bearer(token, ip)))?.status ?? 200;

const verify = vi.fn();
beforeEach(() => {
  verify.mockReset();
  resetAdminAuthForTests();
  setIdTokenVerifierForTests(verify);
  vi.stubEnv('ADMIN_API_TOKEN', '');
  vi.stubEnv('ADMIN_EMAILS', 'amperagebattery@gmail.com');
});
afterEach(() => {
  vi.unstubAllEnvs();
  setIdTokenVerifierForTests(null);
});

describe('Firebase ID token login', () => {
  it('accepts a verified token whose email is on the list', async () => {
    verify.mockResolvedValue({ email: 'amperagebattery@gmail.com', email_verified: true });
    expect(await status('id-token')).toBe(200);
    expect(verify).toHaveBeenCalledWith('id-token');
  });
  it('ignores case and spaces, and supports several admins', async () => {
    vi.stubEnv('ADMIN_EMAILS', ' Someone@Example.com , AmperageBattery@Gmail.com ');
    verify.mockResolvedValue({ email: 'AMPERAGEBATTERY@gmail.com', email_verified: true });
    expect(await status('t')).toBe(200);
  });
  it.each([
    ['an email that is not on the list', { email: 'stranger@gmail.com', email_verified: true }],
    ['an unverified email', { email: 'amperagebattery@gmail.com', email_verified: false }],
    ['no verified flag', { email: 'amperagebattery@gmail.com' }],
    ['no email at all', { email_verified: true }],
  ])('rejects %s', async (_n, claims) => {
    verify.mockResolvedValue(claims);
    expect(await status('t')).toBe(401);
  });
  it('rejects a token the verifier refuses (expired, forged, wrong project)', async () => {
    verify.mockRejectedValue(new Error('auth/id-token-expired'));
    const res = await requireAdmin(bearer('t'));
    expect(res?.status).toBe(401);
    expect(await res?.text()).toBe('{"error":"unauthorized"}');
  });
  it('an empty bearer never reaches the verifier', async () => {
    expect(await status('')).toBe(401);
    expect(verify).not.toHaveBeenCalled();
  });
});

describe('configuration', () => {
  it('nothing configured → 503 and the verifier is never asked', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    expect(await status('anything')).toBe(503);
    expect(verify).not.toHaveBeenCalled();
  });
  it('only the static token configured: ID tokens are not accepted and never verified', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    vi.stubEnv('ADMIN_API_TOKEN', 'static-token-0123456789-abcdefgh');
    verify.mockResolvedValue({ email: 'amperagebattery@gmail.com', email_verified: true });
    expect(await status('static-token-0123456789-abcdefgh')).toBe(200);
    expect(await status('some-id-token')).toBe(401);
    expect(verify).not.toHaveBeenCalled();
  });
  it('both configured: the static token wins without a Firebase call; anything else goes to Firebase', async () => {
    vi.stubEnv('ADMIN_API_TOKEN', 'static-token-0123456789-abcdefgh');
    expect(await status('static-token-0123456789-abcdefgh')).toBe(200);
    expect(verify).not.toHaveBeenCalled();
    verify.mockRejectedValue(new Error('nope'));
    expect(await status('other')).toBe(401);
    expect(verify).toHaveBeenCalledTimes(1);
  });
  it('a too-short static token does not count as configured', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    vi.stubEnv('ADMIN_API_TOKEN', 'short');
    expect(await status('short')).toBe(503);
  });
});

describe('lockout', () => {
  it('10 rejected ID tokens lock the address out, even for a valid one', async () => {
    verify.mockRejectedValue(new Error('bad'));
    for (let i = 0; i < 10; i++) expect(await status('bad', '4.4.4.4')).toBe(401);
    verify.mockResolvedValue({ email: 'amperagebattery@gmail.com', email_verified: true });
    expect(await status('good', '4.4.4.4')).toBe(429);
    expect(await status('good', '5.5.5.5')).toBe(200);
  });
});
