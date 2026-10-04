import { describe, expect, it } from 'vitest';
import { parseServiceAccount } from './firebase-app';

const key = { type: 'service_account', project_id: 'demo-proj', client_email: 'svc@demo-proj.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n' };

describe('parseServiceAccount', () => {
  it('reads raw JSON', () => {
    expect(parseServiceAccount(JSON.stringify(key))).toEqual({ projectId: 'demo-proj', clientEmail: key.client_email, privateKey: key.private_key });
  });
  it('reads base64-encoded JSON, with surrounding whitespace', () => {
    const b64 = Buffer.from(JSON.stringify(key)).toString('base64');
    expect(parseServiceAccount(`  ${b64}\n`).projectId).toBe('demo-proj');
  });
  it('turns literal \\n sequences in the private key into newlines', () => {
    const mangled = { ...key, private_key: key.private_key.replace(/\n/g, '\\n') };
    expect(parseServiceAccount(JSON.stringify(mangled)).privateKey).toBe(key.private_key);
  });
  it('rejects garbage and incomplete keys without leaking the content', () => {
    expect(() => parseServiceAccount('definitely not json')).toThrow(/neither valid JSON nor base64/);
    const partial = Object.fromEntries(Object.entries(key).filter(([k]) => k !== 'private_key'));
    let message = '';
    try { parseServiceAccount(JSON.stringify(partial)); } catch (e) { message = (e as Error).message; }
    expect(message).toMatch(/missing project_id, client_email or private_key/);
    expect(message).not.toContain('demo-proj');
    expect(message).not.toContain(key.client_email);
  });
});
