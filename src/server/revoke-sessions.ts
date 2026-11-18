import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './firebase-app';

/** Signs the admin accounts out everywhere: their refresh tokens are revoked, so every open session has to log in again. */
export async function revokeAdminSessions(env: Record<string, string | undefined> = process.env): Promise<void> {
  const emails = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  const auth = getAuth(getAdminApp());
  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.revokeRefreshTokens(user.uid);
    } catch (e) {
      console.error('revoke sessions failed', e instanceof Error ? e.message : 'unknown'); // e.g. that admin never signed in
    }
  }
}
