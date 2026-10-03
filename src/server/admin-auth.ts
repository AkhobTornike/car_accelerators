import { createHash, timingSafeEqual } from 'node:crypto';

// Interim guard until real admin login exists (Firebase Auth, Phase 5). Fails CLOSED: no configured token = no admin API.
// The failure counter is per process (fine for one instance; replace with a shared store when scaling out).
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

const digest = (s: string) => createHash('sha256').update(s).digest();
const deny = (status: number, error: string, extra: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } });

export function requireAdmin(request: Request, now = Date.now()): Response | null {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token || token.length < 24) return deny(503, 'admin_disabled');

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const f = failures.get(ip);
  if (f && now - f.since < WINDOW_MS && f.count >= MAX_FAILURES) {
    return deny(429, 'too_many_attempts', { 'Retry-After': String(Math.ceil((f.since + WINDOW_MS - now) / 1000)) });
  }

  const given = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  if (timingSafeEqual(digest(given), digest(token))) {
    failures.delete(ip);
    return null;
  }
  const fresh = !f || now - f.since >= WINDOW_MS;
  failures.set(ip, { count: fresh ? 1 : f.count + 1, since: fresh ? now : f.since });
  return deny(401, 'unauthorized');
}

export function resetAdminAuthForTests() {
  failures.clear();
}
