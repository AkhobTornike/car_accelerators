import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Admin SDK handle. Credentials come from GOOGLE_APPLICATION_CREDENTIALS (path to the service-account JSON),
 * or from FIRESTORE_EMULATOR_HOST (tests/dev: no credentials, nothing real is touched).
 * `projectId` selects a separate app (and, on the emulator, a separate empty database) — used by tests.
 */
export function getDb(projectId?: string) {
  const name = projectId ?? '[DEFAULT]';
  const existing = getApps().find((a) => a.name === name);
  if (existing) return getFirestore(getApp(name));
  const app = initializeApp(
    process.env.FIRESTORE_EMULATOR_HOST
      ? { projectId: projectId ?? process.env.GCLOUD_PROJECT ?? 'demo-amper' }
      : { credential: applicationDefault(), projectId },
    name,
  );
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}
