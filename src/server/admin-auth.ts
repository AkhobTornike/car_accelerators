import { createHash, timingSafeEqual } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './firebase-app';
import { validAdminSegments, rotates } from './admin-path';
import { getAdminEpoch, registerAdminAccess } from './security-state';
import { sendSecurityAlert } from './security-alert';

// Who may call /api/admin/*:
//  1. A Firebase ID token (the admin signed in with Google) whose verified email is in ADMIN_EMAILS (comma separated).
//  2. Optionally a static bearer token ADMIN_API_TOKEN (>= 24 chars) for curl/scripts/dev. Leave it unset in production.
// Fails CLOSED: neither configured = no admin API. Wrong credentials are counted per address and locked out.
// The failure counter is per process (fine for one instance; replace with a shared store when scaling out).
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

export type IdTokenVerifier = (token: string) => Promise<{ email?: string; email_verified?: boolean }>;
// checkRevoked = true: tokens of sessions that were signed out on purpose (link rotation) stop working at once.
const firebaseVerifier: IdTokenVerifier = (token) => getAuth(getAdminApp()).verifyIdToken(token, true);
let verifier: IdTokenVerifier = firebaseVerifier;

const digest = (s: string) => createHash('sha256').update(s).digest();
const sameSecret = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));
const deny = (status: number, error: string, extra: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } });

const allowedEmails = () =>
  new Set((process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));

type Verdict = { kind: 'static' } | { kind: 'admin'; email: string } | { kind: 'stranger'; email: string | null } | { kind: 'denied' };

// "stranger" = a genuine Firebase login (the token verified) of someone who is not on the list. That is a security event;
// a token that does not verify at all (garbage, expired, another project) is just denied — anyone can send those.
async function judge(given: string, staticToken: string | undefined, emails: Set<string>): Promise<Verdict> {
  if (!given) return { kind: 'denied' };
  if (staticToken && sameSecret(given, staticToken)) return { kind: 'static' };
  if (!emails.size) return { kind: 'denied' };
  try {
    const decoded = await verifier(given);
    const email = decoded.email?.toLowerCase() ?? null;
    if (decoded.email_verified === true && email && emails.has(email)) return { kind: 'admin', email };
    return { kind: 'stranger', email };
  } catch {
    return { kind: 'denied' }; // malformed, expired, wrong project, revoked... all the same to the caller
  }
}

export async function requireAdmin(request: Request, now = Date.now()): Promise<Response | null> {
  const staticToken = process.env.ADMIN_API_TOKEN && process.env.ADMIN_API_TOKEN.length >= 24 ? process.env.ADMIN_API_TOKEN : undefined;
  const emails = allowedEmails();
  if (!staticToken && !emails.size) return deny(503, 'admin_disabled');

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const f = failures.get(ip);
  if (f && now - f.since < WINDOW_MS && f.count >= MAX_FAILURES) {
    return deny(429, 'too_many_attempts', { 'Retry-After': String(Math.ceil((f.since + WINDOW_MS - now) / 1000)) });
  }

  const given = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  const verdict = await judge(given, staticToken, emails);
  if (verdict.kind === 'admin' && rotates()) {
    // A session belongs to the address it was opened on (the page sends it in X-Admin-Link). After a rotation every older
    // address is dead, so sessions opened on one lose access immediately, even though their login is still valid.
    const link = request.headers.get('x-admin-link') ?? '';
    if (!validAdminSegments(process.env, new Date(now), await getAdminEpoch(now, true)).includes(link)) return deny(401, 'link_expired');
  }
  if (verdict.kind === 'static' || verdict.kind === 'admin') {
    failures.delete(ip);
    if (verdict.kind === 'admin') {
      const rotation = await registerAdminAccess({ ip, email: verdict.email, allowed: true });
      if (rotation) await sendSecurityAlert(rotation);
    }
    return null;
  }
  if (verdict.kind === 'stranger') {
    const rotation = await registerAdminAccess({ ip, email: verdict.email, allowed: false });
    if (rotation) await sendSecurityAlert(rotation);
  }
  const fresh = !f || now - f.since >= WINDOW_MS;
  failures.set(ip, { count: fresh ? 1 : f.count + 1, since: fresh ? now : f.since });
  return deny(401, 'unauthorized');
}

export function resetAdminAuthForTests() {
  failures.clear();
}

export function setIdTokenVerifierForTests(v: IdTokenVerifier | null) {
  verifier = v ?? firebaseVerifier;
}
