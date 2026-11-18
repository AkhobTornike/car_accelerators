import { getDb } from './firestore-db';

// Security state of the admin door: the link "epoch" and the IP addresses admins have used.
//
// - epoch: part of the key of the weekly admin address (admin-path.ts). Bumping it kills every address issued before.
// - knownIps: addresses an allowed admin has used. The first one is learnt silently; a later new one is a security event.
// - lastRotationAt: events inside COOLDOWN_MS do not rotate again, so nobody can flood the owners with emails or keep
//   locking them out by hammering the API.
// Stored in Firestore (adminSecurity/state) so every serverless instance sees the same state; without Firestore
// (local development) it lives in memory.

export const COOLDOWN_MS = 10 * 60_000;
const MAX_IPS = 50;
const EPOCH_CACHE_MS = 15_000;

export interface SecurityState { epoch: number; knownIps: string[]; lastRotationAt: number }
export type RotationReason = 'wrong-email' | 'new-ip';
export interface AccessEvent { ip: string; email: string | null; allowed: boolean }
export interface Rotation { reason: RotationReason; ip: string; email: string | null; epoch: number }

const empty = (): SecurityState => ({ epoch: 0, knownIps: [], lastRotationAt: 0 });

/** Pure decision: the next state and whether this event rotates the link. */
export function decide(state: SecurityState, ev: AccessEvent, now: number): { state: SecurityState; rotation: Rotation | null } {
  const coolingDown = now - state.lastRotationAt < COOLDOWN_MS;
  const rotate = (reason: RotationReason, knownIps = state.knownIps) => {
    const next = { epoch: state.epoch + 1, knownIps, lastRotationAt: now };
    return { state: next, rotation: { reason, ip: ev.ip, email: ev.email, epoch: next.epoch } };
  };
  if (!ev.allowed) return coolingDown ? { state, rotation: null } : rotate('wrong-email');
  if (state.knownIps.includes(ev.ip)) return { state, rotation: null };
  const knownIps = [...state.knownIps, ev.ip].slice(-MAX_IPS);
  if (state.knownIps.length === 0) return { state: { ...state, knownIps }, rotation: null }; // first admin address: just learn it
  return coolingDown ? { state: { ...state, knownIps }, rotation: null } : rotate('new-ip', knownIps);
}

interface Store { read(): Promise<SecurityState>; update<R>(fn: (s: SecurityState) => { state: SecurityState; result: R }): Promise<R> }

let memoryState = empty();
const memoryStore: Store = {
  read: async () => memoryState,
  update: async (fn) => {
    const { state, result } = fn(memoryState);
    memoryState = state;
    return result;
  },
};

const firestoreStore = (): Store => {
  const ref = () => getDb().collection('adminSecurity').doc('state');
  const parse = (d: FirebaseFirestore.DocumentData | undefined): SecurityState => ({
    epoch: Number(d?.epoch ?? 0),
    knownIps: Array.isArray(d?.knownIps) ? d.knownIps.filter((x: unknown): x is string => typeof x === 'string') : [],
    lastRotationAt: Number(d?.lastRotationAt ?? 0),
  });
  return {
    read: async () => parse((await ref().get()).data()),
    update: (fn) =>
      getDb().runTransaction(async (tx) => {
        const snap = await tx.get(ref());
        const { state, result } = fn(parse(snap.data()));
        tx.set(ref(), state);
        return result;
      }),
  };
};

const store = (env: Record<string, string | undefined> = process.env): Store => (env.DATA_BACKEND === 'firestore' ? firestoreStore() : memoryStore);

let epochCache: { value: number; at: number } | null = null;

/**
 * The current epoch, cached for a few seconds (the proxy asks on every admin page request). `fresh` skips the cache:
 * used by the admin API, so a rotated link locks out open sessions at once. Falls back to 0 on errors.
 */
export async function getAdminEpoch(now = Date.now(), fresh = false): Promise<number> {
  if (!fresh && epochCache && now - epochCache.at < EPOCH_CACHE_MS) return epochCache.value;
  try {
    const { epoch } = await store().read();
    epochCache = { value: epoch, at: now };
    return epoch;
  } catch {
    return epochCache?.value ?? 0;
  }
}

/** Rotate the admin address on purpose (the admin's "send now" button): every earlier address dies, no cooldown. Returns the new epoch. */
export async function rotateAdminLinkNow(now = Date.now()): Promise<number> {
  const epoch = await store().update((s) => {
    const next = { ...s, epoch: s.epoch + 1, lastRotationAt: now };
    return { state: next, result: next.epoch };
  });
  epochCache = { value: epoch, at: now };
  return epoch;
}

const knownCache = new Set<string>(); // IPs already known to be fine, so ordinary admin calls cost no database read

/**
 * Called for every authenticated admin API call that reaches a verdict. Returns the rotation if this call caused one
 * (the caller then emails the new link); null otherwise. Never throws: a broken database must not lock the admin out.
 */
export async function registerAdminAccess(ev: AccessEvent, now = Date.now()): Promise<Rotation | null> {
  if (ev.allowed && knownCache.has(ev.ip)) return null;
  try {
    const result = await store().update((s) => {
      const d = decide(s, ev, now);
      return { state: d.state, result: d };
    });
    if (ev.allowed) knownCache.add(ev.ip);
    if (result.rotation) epochCache = { value: result.rotation.epoch, at: now };
    return result.rotation;
  } catch (e) {
    console.error('security state failed', e instanceof Error ? e.message : 'unknown');
    return null;
  }
}

export function resetSecurityStateForTests() {
  memoryState = empty();
  epochCache = null;
  knownCache.clear();
}
