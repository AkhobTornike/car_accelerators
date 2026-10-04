import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './firebase-app';

/** Firestore handle on the shared Admin SDK app (see firebase-app.ts). A `projectId` gives tests an isolated database. */
export function getDb(projectId?: string) {
  const app = getAdminApp(projectId);
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() may only be called once, before the first use of an instance
  }
  return db;
}
