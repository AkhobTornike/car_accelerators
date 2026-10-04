import { applicationDefault, cert, getApp, getApps, initializeApp, type Credential } from 'firebase-admin/app';

const emulated = () => Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

/**
 * Service-account key from an environment variable, for hosts without a filesystem key (Vercel).
 * Accepts the raw JSON or the same JSON base64-encoded (easier to paste into a one-line env field).
 * Throws a message that never contains the key.
 */
export function parseServiceAccount(raw: string): { projectId: string; clientEmail: string; privateKey: string } {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw.trim(), 'base64').toString('utf8');
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is neither valid JSON nor base64-encoded JSON');
  }
  const { project_id, client_email, private_key } = json as Record<string, string | undefined>;
  if (!project_id || !client_email || !private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing project_id, client_email or private_key');
  // Hosts often store the key with literal "\n" sequences.
  return { projectId: project_id, clientEmail: client_email, privateKey: private_key.replace(/\\n/g, '\n') };
}

function credential(): Credential {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return inline ? cert(parseServiceAccount(inline)) : applicationDefault();
}

/**
 * The one Admin SDK app, shared by Firestore and Auth. Credentials: FIREBASE_SERVICE_ACCOUNT_JSON (hosted),
 * or GOOGLE_APPLICATION_CREDENTIALS (path to the service-account JSON, local). With an emulator host set,
 * no credentials are used and nothing real is touched.
 * `projectId` selects a separate named app — used by tests to get a separate empty emulator database.
 */
export function getAdminApp(projectId?: string) {
  const name = projectId ?? '[DEFAULT]';
  const existing = getApps().find((a) => a.name === name);
  if (existing) return getApp(name);
  return initializeApp(
    emulated() ? { projectId: projectId ?? process.env.GCLOUD_PROJECT ?? 'demo-amper' } : { credential: credential(), projectId },
    name,
  );
}
