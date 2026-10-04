import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getAuth } from 'firebase-admin/auth';
import { requireAdmin, resetAdminAuthForTests } from './admin-auth';
import { getAdminApp } from './firebase-app';

// Real Firebase token verification against the Auth emulator:  npm run test:emulators
// Plain `npm test` skips this file on purpose; REQUIRE_EMULATOR=1 turns the skip into a failure.
const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;

async function idTokenFor(email: string, emailVerified: boolean) {
  const auth = getAuth(getAdminApp());
  const user = await auth.createUser({ email, emailVerified });
  const customToken = await auth.createCustomToken(user.uid);
  const res = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  return ((await res.json()) as { idToken: string }).idToken;
}

const call = async (token: string) =>
  (await requireAdmin(new Request('http://localhost/api/admin/sales', { headers: { Authorization: `Bearer ${token}` } })))?.status ?? 200;

if (!host && process.env.REQUIRE_EMULATOR) {
  describe('Auth emulator', () => {
    it('is required but FIREBASE_AUTH_EMULATOR_HOST is not set', () => expect(host).toBeDefined());
  });
} else if (host) {
  describe('admin login with real Firebase ID tokens (Auth emulator)', () => {
    const original = { ...process.env };
    beforeAll(() => {
      process.env.ADMIN_EMAILS = 'amperagebattery@gmail.com';
      delete process.env.ADMIN_API_TOKEN;
      resetAdminAuthForTests();
    });
    afterAll(() => {
      process.env = original;
    });

    it('lets the allow-listed, verified admin in', async () => {
      expect(await call(await idTokenFor('amperagebattery@gmail.com', true))).toBe(200);
    });
    it('rejects a verified user who is not on the list', async () => {
      expect(await call(await idTokenFor('stranger@gmail.com', true))).toBe(401);
    });
    it('rejects an unverified email even if it is on the list', async () => {
      resetAdminAuthForTests();
      process.env.ADMIN_EMAILS = 'amperagebattery@gmail.com,unverified@gmail.com';
      expect(await call(await idTokenFor('unverified@gmail.com', false))).toBe(401);
    });
    it('rejects garbage and truncated tokens', async () => {
      expect(await call('not-a-token')).toBe(401);
      const good = await idTokenFor('another@gmail.com', true);
      expect(await call(good.slice(0, -5))).toBe(401);
    });
  });
} else {
  describe.skip('Auth emulator: skipped — run `npm run test:emulators`', () => {
    it('skipped', () => {});
  });
}
