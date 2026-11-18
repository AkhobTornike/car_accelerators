import { beforeEach, describe, expect, it } from 'vitest';
import {
  approve, approveDevice, COOLDOWN_MS, decide, getAdminEpoch, listPendingDevices, registerAdminAccess, reject, rejectDevice,
  resetSecurityStateForTests, type SecurityState,
} from './security-state';

const fresh = (over: Partial<SecurityState> = {}): SecurityState => ({ epoch: 0, knownIps: [], lastRotationAt: 0, events: [], pending: [], ...over });
const T = 1_000_000_000_000;
const admin = (ip: string) => ({ ip, email: 'a@x.ge', allowed: true });

describe('decide: allowed admins', () => {
  it('learns the first admin address silently and trusts it', () => {
    const d = decide(fresh(), admin('1.1.1.1'), T);
    expect(d).toMatchObject({ rotation: null, device: 'trusted', newPending: null });
    expect(d.state.knownIps).toEqual(['1.1.1.1']);
  });
  it('trusts a known address without touching the state', () => {
    const s = fresh({ knownIps: ['1.1.1.1'] });
    expect(decide(s, admin('1.1.1.1'), T)).toEqual({ state: s, rotation: null, device: 'trusted', newPending: null });
  });
  it('queues a new address as pending: no rotation, not trusted, not learnt', () => {
    const d = decide(fresh({ knownIps: ['1.1.1.1'] }), admin('2.2.2.2'), T);
    expect(d.rotation).toBeNull();
    expect(d.device).toBe('pending');
    expect(d.newPending).toEqual({ ip: '2.2.2.2', email: 'a@x.ge', at: new Date(T).toISOString() });
    expect(d.state.pending).toHaveLength(1);
    expect(d.state.knownIps).toEqual(['1.1.1.1']);
    expect(d.state.epoch).toBe(0);
  });
  it('a device that is already waiting stays pending and is not announced again', () => {
    const s = decide(fresh({ knownIps: ['1.1.1.1'] }), admin('2.2.2.2'), T).state;
    const again = decide(s, admin('2.2.2.2'), T + 1000);
    expect(again).toMatchObject({ device: 'pending', newPending: null, rotation: null });
    expect(again.state.pending).toHaveLength(1);
  });
  it('keeps at most 10 waiting devices', () => {
    let s = fresh({ knownIps: ['1.1.1.1'] });
    for (let i = 0; i < 15; i++) s = decide(s, admin(`9.9.9.${i}`), T).state;
    expect(s.pending).toHaveLength(10);
  });
});

describe('decide: strangers (valid login, wrong email)', () => {
  it('rotates the link, never learns the address, and logs the event', () => {
    const d = decide(fresh({ knownIps: ['1.1.1.1'] }), { ip: '6.6.6.6', email: 'evil@x.com', allowed: false }, T);
    expect(d.rotation).toEqual({ reason: 'wrong-email', ip: '6.6.6.6', email: 'evil@x.com', epoch: 1 });
    expect(d.state.knownIps).toEqual(['1.1.1.1']);
    expect(d.state.events).toEqual([{ at: new Date(T).toISOString(), reason: 'wrong-email', ip: '6.6.6.6', email: 'evil@x.com' }]);
  });
  it('does not rotate again inside the cooldown, and rotates once it is over', () => {
    const s = fresh({ epoch: 1, knownIps: ['1.1.1.1'], lastRotationAt: T });
    const ev = { ip: '6.6.6.6', email: 'e@x.com', allowed: false };
    expect(decide(s, ev, T + COOLDOWN_MS - 1).rotation).toBeNull();
    expect(decide(s, ev, T + COOLDOWN_MS).rotation?.epoch).toBe(2);
  });
  it('keeps only the last 20 events', () => {
    let state = fresh({ knownIps: ['1.1.1.1'] });
    for (let i = 0; i < 30; i++) state = decide({ ...state, lastRotationAt: 0 }, { ip: `9.9.9.${i}`, email: null, allowed: false }, T + i).state;
    expect(state.events).toHaveLength(20);
  });
});

describe('approve / reject', () => {
  const waiting = () => decide(fresh({ knownIps: ['1.1.1.1'] }), admin('2.2.2.2'), T).state;
  it('approving trusts the address and clears the request', () => {
    const s = approve(waiting(), '2.2.2.2');
    expect(s.knownIps).toEqual(['1.1.1.1', '2.2.2.2']);
    expect(s.pending).toEqual([]);
    expect(s.epoch).toBe(0);
  });
  it('approving something that is not waiting changes nothing', () => {
    const s = waiting();
    expect(approve(s, '7.7.7.7')).toBe(s);
  });
  it('rejecting forgets the request and rotates the link at once (no cooldown)', () => {
    const s = { ...waiting(), lastRotationAt: T };
    const r = reject(s, '2.2.2.2', T + 1);
    expect(r.rotation).toEqual({ reason: 'device-rejected', ip: '2.2.2.2', email: 'a@x.ge', epoch: 1 });
    expect(r.state.pending).toEqual([]);
    expect(r.state.knownIps).toEqual(['1.1.1.1']);
  });
  it('rejecting something that is not waiting does nothing', () => {
    expect(reject(waiting(), '7.7.7.7', T).rotation).toBeNull();
  });
});

describe('registerAdminAccess (memory store)', () => {
  beforeEach(resetSecurityStateForTests);
  it('walks a new laptop through pending -> approved', async () => {
    expect((await registerAdminAccess(admin('1.1.1.1'), T)).device).toBe('trusted');
    const first = await registerAdminAccess(admin('2.2.2.2'), T + 1);
    expect(first).toMatchObject({ device: 'pending', rotation: null });
    expect(first.newPending?.ip).toBe('2.2.2.2');
    expect((await listPendingDevices()).map((p) => p.ip)).toEqual(['2.2.2.2']);
    expect((await registerAdminAccess(admin('2.2.2.2'), T + 2)).newPending).toBeNull();
    expect(await approveDevice('2.2.2.2')).toBe(true);
    expect((await registerAdminAccess(admin('2.2.2.2'), T + 3)).device).toBe('trusted');
    expect(await listPendingDevices()).toEqual([]);
  });
  it('rejecting bumps the epoch that the proxy reads', async () => {
    await registerAdminAccess(admin('1.1.1.1'), T);
    await registerAdminAccess(admin('2.2.2.2'), T + 1);
    expect(await getAdminEpoch(T + 2, true)).toBe(0);
    const rotation = await rejectDevice('2.2.2.2', T + 3);
    expect(rotation?.epoch).toBe(1);
    expect(await getAdminEpoch(T + 4, true)).toBe(1);
    expect((await registerAdminAccess(admin('2.2.2.2'), T + 5)).device).toBe('pending'); // forgotten: has to ask again
  });
  it('a stranger rotates the link', async () => {
    await registerAdminAccess(admin('1.1.1.1'), T);
    const r = await registerAdminAccess({ ip: '6.6.6.6', email: 'e@x.com', allowed: false }, T + 5);
    expect(r.rotation?.epoch).toBe(1);
    expect(await getAdminEpoch(T + 6)).toBe(1);
  });
});
