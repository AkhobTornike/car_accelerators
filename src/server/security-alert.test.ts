import { describe, expect, it } from 'vitest';
import { buildDeviceRequestAlert, buildSecurityAlert } from './security-alert';

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
    const { text, html } = buildSecurityAlert({ reason: 'device-rejected', ip: '2.2.2.2', email: '<b>x</b>@y.z', epoch: 1 }, now, null, false);
    expect(text).toContain('უარყოფილია ადმინ პანელიდან');
    expect(text).toContain('გამორთულია');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;@y.z');
  });
});

describe('buildDeviceRequestAlert', () => {
  it('asks the owners to approve, names the device and does not claim the link changed', () => {
    const { subject, text, html } = buildDeviceRequestAlert({ ip: '2.2.2.2', email: 'liza@x.ge', at: '2026-11-18T10:00:00Z' }, 'https://ampera.ge/m/abc/');
    expect(subject).toContain('ახალი მოწყობილობა');
    expect(text).toContain('IP: 2.2.2.2');
    expect(text).toContain('ანგარიში: liza@x.ge');
    expect(text).toContain('ლინკი არ შეცვლილა');
    expect(text).toContain('„დაუშვი"');
    expect(html).toContain('href="https://ampera.ge/m/abc/"');
  });
  it('escapes the email and works without a link', () => {
    const { html, text } = buildDeviceRequestAlert({ ip: '3.3.3.3', email: '<i>x</i>', at: '2026-11-18T10:00:00Z' }, null);
    expect(html).toContain('&lt;i&gt;x&lt;/i&gt;');
    expect(text).not.toContain('ადმინ პანელი: ');
  });
});
