import { getDb } from './firestore-db';

// The admin's "send the summary now" button may be used at most MANUAL_SENDS_PER_DAY times per calendar day (Tbilisi time).
// The count lives in Firestore (collection mailLog) so it is shared by every serverless instance; without Firestore
// (local development) it is kept in memory. The Monday cron is not counted.
export const MANUAL_SENDS_PER_DAY = 10;

const memory = new Map<string, number>();

/** Calendar day in Tbilisi (UTC+4, no daylight saving), e.g. "2026-11-18". */
export const tbilisiDay = (now: Date): string => new Date(now.getTime() + 4 * 3_600_000).toISOString().slice(0, 10);

export async function takeManualSlot(now: Date = new Date(), env: Record<string, string | undefined> = process.env): Promise<{ allowed: boolean; used: number }> {
  const day = tbilisiDay(now);
  if (env.DATA_BACKEND === 'firestore') {
    const db = getDb();
    const ref = db.collection('mailLog').doc(`summary-${day}`);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
      if (used >= MANUAL_SENDS_PER_DAY) return { allowed: false, used };
      tx.set(ref, { count: used + 1, day });
      return { allowed: true, used: used + 1 };
    });
  }
  const used = memory.get(day) ?? 0;
  if (used >= MANUAL_SENDS_PER_DAY) return { allowed: false, used };
  memory.set(day, used + 1);
  return { allowed: true, used: used + 1 };
}

export function resetSendLimitForTests() {
  memory.clear();
}
