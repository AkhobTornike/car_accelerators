import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createFirestoreRepositories } from './firestore-repository';
import { getDb } from './firestore-db';
import { repositoryContract } from './repository-contract';

// Needs the Firestore emulator:  npm run test:emulators  (it starts one and sets FIRESTORE_EMULATOR_HOST).
// Plain `npm test` skips this file ON PURPOSE and says so; REQUIRE_EMULATOR=1 turns the skip into a failure.
const host = process.env.FIRESTORE_EMULATOR_HOST;

if (!host && process.env.REQUIRE_EMULATOR) {
  describe('Firestore emulator', () => {
    it('is required but FIRESTORE_EMULATOR_HOST is not set', () => expect(host).toBeDefined());
  });
} else if (host) {
  // A fresh project id per test = a fresh empty database, no cleanup needed.
  repositoryContract('Firestore (emulator)', async () => {
    const db = getDb(`demo-amper-${randomBytes(4).toString('hex')}`);
    return createFirestoreRepositories(db, { cacheMs: 60_000 });
  });
} else {
  describe.skip('Firestore (emulator): skipped — run `npm run test:emulators`', () => {
    it('skipped', () => {});
  });
}
