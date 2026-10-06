import { describe, expect, it } from 'vitest';
import { batteryDims, batteryTechColor, batteryTechLabel } from './BatteryRender';

describe('battery render parameters', () => {
  it('maps known case codes to demo dimensions', () => {
    expect(batteryDims('MOTO')).toEqual({ w: 136, h: 86 });
    expect(batteryDims('L1')).toEqual({ w: 152, h: 122 });
    expect(batteryDims('L2')).toEqual({ w: 178, h: 130 });
    expect(batteryDims('L3')).toEqual({ w: 206, h: 134 });
    expect(batteryDims('L5')).toEqual({ w: 246, h: 140 });
  });
  it('falls back to a sensible default for unknown codes', () => {
    expect(batteryDims('ZZ9')).toEqual({ w: 178, h: 130 });
    expect(batteryDims('')).toEqual({ w: 178, h: 130 });
  });
  it('labels tech like the demo', () => {
    expect(batteryTechLabel('AGM')).toBe('AGM');
    expect(batteryTechLabel('EFB')).toBe('EFB');
    expect(batteryTechLabel('SMF')).toBe('SMF');
    expect(batteryTechLabel('DEEP-CYCLE')).toBe('DC');
  });
  it('colors tech like the demo', () => {
    expect(batteryTechColor('AGM')).toBe('var(--amber-ink)');
    expect(batteryTechColor('EFB')).toBe('var(--ok)');
    expect(batteryTechColor('SMF')).toBe('var(--ink-2)');
    expect(batteryTechColor('DEEP-CYCLE')).toBe('var(--ink-2)');
  });
});
