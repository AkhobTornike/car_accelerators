import { describe, expect, it } from 'vitest';
import { buildSecurityAlert } from './security-alert';

const now = new Date('2026-11-18T10:00:00Z');
describe('buildSecurityAlert', () => {
  it('names the reason, address, account and the new link', () => {
    const { text, html, subject } = buildSecurityAlert({ reason: 'wrong-email', ip: '6.6.6.6', email: 'evil@x.com', epoch: 1 }, now, 'https://ampera.ge/m/abc/', true);
    expect(subject).toContain('ადმინ ლინკი შეიცვალა');
    expect(text).toContain('უცხო Google ანგარიშმა');
    expect(text).toContain('IP: 6.6.6.6');
    expect(text).toContain('ანგარიში: evil@x.com');
    expect(text).toContain('https://ampera.ge/m/abc/');
    expect(text).toContain('14:00');
    expect(html).toContain('href="https://ampera.ge/m/abc/"');
  });
  it('says so when rotation is off and escapes the attacker-controlled email', () => {
    const { text, html } = buildSecurityAlert({ reason: 'new-ip', ip: '2.2.2.2', email: '<b>x</b>@y.z', epoch: 1 }, now, null, false);
    expect(text).toContain('ახალი IP მისამართიდან');
    expect(text).toContain('გამორთულია');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;@y.z');
  });
});
