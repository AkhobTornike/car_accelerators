import { beforeEach, describe, expect, it } from 'vitest';
import { COOLDOWN_MS, decide, getAdminEpoch, registerAdminAccess, resetSecurityStateForTests, type SecurityState } from './security-state';

const fresh = (over: Partial<SecurityState> = {}): SecurityState => ({ epoch: 0, knownIps: [], lastRotationAt: 0, events: [], ...over });
const T = 1_000_000_000_000;

describe('decide', () => {
  it('learns the first admin address silently', () => {
    const d = decide(fresh(), { ip: '1.1.1.1', email: 'a@x.ge', allowed: true }, T);
    expect(d.rotation).toBeNull();
    expect(d.state.knownIps).toEqual(['1.1.1.1']);
    expect(d.state.epoch).toBe(0);
  });
  it('keeps the last rotations (who, from where) so an address can be looked up and trusted', () => {
    const d = decide(fresh({ knownIps: ['1.1.1.1'] }), { ip: '6.6.6.6', email: 'e@x.com', allowed: false }, T);
    expect(d.state.events).toEqual([{ at: new Date(T).toISOString(), reason: 'wrong-email', ip: '6.6.6.6', email: 'e@x.com' }]);
    let state = d.state;
    for (let i = 0; i < 30; i++) state = decide({ ...state, lastRotationAt: 0 }, { ip: `9.9.9.${i}`, email: null, allowed: false }, T + i).state;
    expect(state.events).toHaveLength(20);
  });
  it('does nothing for a known address', () => {
    const s = fresh({ knownIps: ['1.1.1.1'] });
    expect(decide(s, { ip: '1.1.1.1', email: 'a@x.ge', allowed: true }, T)).toEqual({ state: s, rotation: null });
  });
  it('rotates on a new address of an allowed admin and remembers it', () => {
    const d = decide(fresh({ knownIps: ['1.1.1.1'] }), { ip: '2.2.2.2', email: 'a@x.ge', allowed: true }, T);
    expect(d.rotation).toEqual({ reason: 'new-ip', ip: '2.2.2.2', email: 'a@x.ge', epoch: 1 });
    expect(d.state).toMatchObject({ epoch: 1, knownIps: ['1.1.1.1', '2.2.2.2'], lastRotationAt: T });
  });
  it('rotates on a stranger (valid login, wrong email) without learning their address', () => {
    const d = decide(fresh({ knownIps: ['1.1.1.1'] }), { ip: '6.6.6.6', email: 'evil@x.com', allowed: false }, T);
    expect(d.rotation).toEqual({ reason: 'wrong-email', ip: '6.6.6.6', email: 'evil@x.com', epoch: 1 });
    expect(d.state.knownIps).toEqual(['1.1.1.1']);
  });
  it('does not rotate again inside the cooldown (no email flood, no lock-out loop)', () => {
    const s = fresh({ epoch: 1, knownIps: ['1.1.1.1'], lastRotationAt: T });
    expect(decide(s, { ip: '6.6.6.6', email: 'e@x.com', allowed: false }, T + COOLDOWN_MS - 1).rotation).toBeNull();
    expect(decide(s, { ip: '2.2.2.2', email: 'a@x.ge', allowed: true }, T + 1000).rotation).toBeNull();
    expect(decide(s, { ip: '6.6.6.6', email: 'e@x.com', allowed: false }, T + COOLDOWN_MS).rotation?.epoch).toBe(2);
  });
});

describe('registerAdminAccess (memory store)', () => {
  beforeEach(resetSecurityStateForTests);
  it('bumps the epoch that the proxy reads', async () => {
    expect(await getAdminEpoch(T)).toBe(0);
    expect(await registerAdminAccess({ ip: '1.1.1.1', email: 'a@x.ge', allowed: true }, T)).toBeNull();
    const r = await registerAdminAccess({ ip: '6.6.6.6', email: 'e@x.com', allowed: false }, T + 5);
    expect(r?.epoch).toBe(1);
    expect(await getAdminEpoch(T + 6)).toBe(1);
  });
});
