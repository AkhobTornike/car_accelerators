import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';

const emulated = () => Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

/**
 * The one Admin SDK app, shared by Firestore and Auth. Credentials: GOOGLE_APPLICATION_CREDENTIALS (service-account
 * JSON path). With an emulator host set, no credentials are used and nothing real is touched.
 * `projectId` selects a separate named app — used by tests to get a separate empty emulator database.
 */
export function getAdminApp(projectId?: string) {
  const name = projectId ?? '[DEFAULT]';
  const existing = getApps().find((a) => a.name === name);
  if (existing) return getApp(name);
  return initializeApp(
    emulated() ? { projectId: projectId ?? process.env.GCLOUD_PROJECT ?? 'demo-amper' } : { credential: applicationDefault(), projectId },
    name,
  );
}
