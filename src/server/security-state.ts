import { getDb } from './firestore-db';

// Security state of the admin door: the link "epoch" and the IP addresses admins have used.
//
// - epoch: part of the key of the weekly admin address (admin-path.ts). Bumping it kills every address issued before.
// - knownIps: trusted addresses. The first admin address is learnt silently; a later new one of an allowed admin is NOT
//   trusted yet: it goes to `pending` and an admin on a trusted address approves or rejects it in the panel. Until then
//   that device can do nothing. Rejecting rotates the link.
// - lastRotationAt: wrong-email events inside COOLDOWN_MS do not rotate again, so nobody can flood the owners with emails
//   or keep locking them out by hammering the API.
// Stored in Firestore (adminSecurity/state) so every serverless instance sees the same state; without Firestore
// (local development) it lives in memory.

export const COOLDOWN_MS = 10 * 60_000;
const MAX_IPS = 50;
const EPOCH_CACHE_MS = 15_000;

export interface SecurityEvent { at: string; reason: RotationReason; ip: string; email: string | null }
export interface PendingDevice { ip: string; email: string | null; at: string }
export interface SecurityState { epoch: number; knownIps: string[]; lastRotationAt: number; events: SecurityEvent[]; pending: PendingDevice[] }
export type RotationReason = 'wrong-email' | 'device-rejected';
export type DeviceStatus = 'trusted' | 'pending';
export interface AccessEvent { ip: string; email: string | null; allowed: boolean }
export interface Rotation { reason: RotationReason; ip: string; email: string | null; epoch: number }

const MAX_EVENTS = 20;
const MAX_PENDING = 10;
const empty = (): SecurityState => ({ epoch: 0, knownIps: [], lastRotationAt: 0, events: [], pending: [] });

export interface Decision { state: SecurityState; rotation: Rotation | null; device: DeviceStatus; newPending: PendingDevice | null }

const rotated = (state: SecurityState, reason: RotationReason, ip: string, email: string | null, now: number, patch: Partial<SecurityState> = {}) => {
  // The last rotations are kept (who, from where) so the owners can look up an address.
  const events = [...state.events, { at: new Date(now).toISOString(), reason, ip, email }].slice(-MAX_EVENTS);
  const next: SecurityState = { ...state, ...patch, epoch: state.epoch + 1, lastRotationAt: now, events };
  return { state: next, rotation: { reason, ip, email, epoch: next.epoch } as Rotation };
};

/** Pure decision for one authenticated admin call: the next state, whether it rotates the link, the device's status. */
export function decide(state: SecurityState, ev: AccessEvent, now: number): Decision {
  const coolingDown = now - state.lastRotationAt < COOLDOWN_MS;
  if (!ev.allowed) {
    if (coolingDown) return { state, rotation: null, device: 'pending', newPending: null };
    return { ...rotated(state, 'wrong-email', ev.ip, ev.email, now), device: 'pending', newPending: null };
  }
  if (state.knownIps.includes(ev.ip)) return { state, rotation: null, device: 'trusted', newPending: null };
  if (state.knownIps.length === 0) {
    // the very first admin address: just learn it
    return { state: { ...state, knownIps: [ev.ip] }, rotation: null, device: 'trusted', newPending: null };
  }
  if (state.pending.some((p) => p.ip === ev.ip)) return { state, rotation: null, device: 'pending', newPending: null };
  const entry: PendingDevice = { ip: ev.ip, email: ev.email, at: new Date(now).toISOString() };
  return { state: { ...state, pending: [...state.pending, entry].slice(-MAX_PENDING) }, rotation: null, device: 'pending', newPending: entry };
}

/** Approve a waiting device: its address becomes trusted. */
export function approve(state: SecurityState, ip: string): SecurityState {
  if (!state.pending.some((p) => p.ip === ip)) return state;
  return { ...state, pending: state.pending.filter((p) => p.ip !== ip), knownIps: [...new Set([...state.knownIps, ip])].slice(-MAX_IPS) };
}

/** Reject a waiting device: it is forgotten and the link is replaced right away (every old address dies). */
export function reject(state: SecurityState, ip: string, now: number): { state: SecurityState; rotation: Rotation | null } {
  const entry = state.pending.find((p) => p.ip === ip);
  if (!entry) return { state, rotation: null };
  return rotated(state, 'device-rejected', ip, entry.email, now, { pending: state.pending.filter((p) => p.ip !== ip) });
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
    events: Array.isArray(d?.events) ? (d.events as SecurityEvent[]) : [],
    pending: Array.isArray(d?.pending) ? (d.pending as PendingDevice[]) : [],
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

const knownCache = new Set<string>(); // IPs already known to be trusted, so ordinary admin calls cost no database read

export interface AccessResult { rotation: Rotation | null; device: DeviceStatus; newPending: PendingDevice | null }

/**
 * Called for every authenticated admin API call that reaches a verdict. Says whether the device is trusted, whether
 * this call rotated the link or queued a new device (the caller then emails the owners). Never throws: a broken database
 * must not lock the admin out, so on errors the device counts as trusted.
 */
export async function registerAdminAccess(ev: AccessEvent, now = Date.now()): Promise<AccessResult> {
  if (ev.allowed && knownCache.has(ev.ip)) return { rotation: null, device: 'trusted', newPending: null };
  try {
    const d = await store().update((s) => {
      const r = decide(s, ev, now);
      return { state: r.state, result: r };
    });
    if (ev.allowed && d.device === 'trusted') knownCache.add(ev.ip);
    if (d.rotation) epochCache = { value: d.rotation.epoch, at: now };
    return { rotation: d.rotation, device: d.device, newPending: d.newPending };
  } catch (e) {
    console.error('security state failed', e instanceof Error ? e.message : 'unknown');
    return { rotation: null, device: 'trusted', newPending: null };
  }
}

/** Devices waiting for approval (shown to admins on trusted addresses). */
export async function listPendingDevices(): Promise<PendingDevice[]> {
  return (await store().read()).pending;
}

export async function approveDevice(ip: string): Promise<boolean> {
  const had = await store().update((s) => ({ state: approve(s, ip), result: s.pending.some((p) => p.ip === ip) }));
  if (had) knownCache.add(ip);
  return had;
}

/** Rejects a device; returns the rotation (the caller emails the new link and signs sessions out) or null when it was not waiting. */
export async function rejectDevice(ip: string, now = Date.now()): Promise<Rotation | null> {
  const r = await store().update((s) => {
    const x = reject(s, ip, now);
    return { state: x.state, result: x.rotation };
  });
  if (r) epochCache = { value: r.epoch, at: now };
  knownCache.delete(ip);
  return r;
}

export function resetSecurityStateForTests() {
  memoryState = empty();
  epochCache = null;
  knownCache.clear();
}
