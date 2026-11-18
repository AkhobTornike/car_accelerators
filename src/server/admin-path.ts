import { createHmac } from 'node:crypto';

// The secret segment of the admin address (/m/<segment>/).
//
// The segment changes by itself every ISO week (UTC, Monday start): it is HMAC-SHA256(ADMIN_PATH, "<year>-W<week>") cut to
// 24 hex characters, and the previous week's segment is still accepted so a link emailed on Monday keeps working until
// the next Monday has passed. The fixed ADMIN_PATH value is not an address any more — it only acts as the key.
// ADMIN_PATH_ROTATE=off switches rotation off and uses ADMIN_PATH itself as the address.
// The Google login stays the real protection; this only hides the door.

export type Env = Record<string, string | undefined>;

/** ISO 8601 week key in UTC, e.g. "2026-W47". Weeks start on Monday. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // the Thursday of this week decides the ISO year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const rotates = (env: Env = process.env) => Boolean(env.ADMIN_PATH) && env.ADMIN_PATH_ROTATE !== 'off';

function segmentFor(key: string, week: string): string {
  return createHmac('sha256', key).update(week).digest('hex').slice(0, 24);
}

/** Segments that open the admin right now (current and, when rotating, the previous week). Empty = admin is off. */
export function validAdminSegments(env: Env = process.env, now: Date = new Date()): string[] {
  const base = env.ADMIN_PATH;
  if (!base) return [];
  if (!rotates(env)) return [base];
  const lastWeek = new Date(now.getTime() - 7 * 86_400_000);
  return [segmentFor(base, isoWeekKey(now)), segmentFor(base, isoWeekKey(lastWeek))];
}

/** The segment to put in a link today. */
export function currentAdminSegment(env: Env = process.env, now: Date = new Date()): string | null {
  return validAdminSegments(env, now)[0] ?? null;
}
