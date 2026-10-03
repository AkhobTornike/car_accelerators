import { describe, expect, it } from 'vitest';
import { specLine } from '@core/fitment-engine';
import type { Battery } from '@core/types';

describe('@core alias', () => {
  it('imports the domain contract', () => {
    const battery: Battery = {
      id: 's60', brand: 'AMPER', name: 'AMPER S60', segment: 'car', tech: 'SMF', voltage: 12, ah: 60, cca: 540,
      polarity: 'R+', caseCode: 'L2', dimsMm: { l: 242, w: 175, h: 190 }, warrantyMonths: 24, price: 215,
      stock: 'in', oemCodes: [], active: true,
    };
    expect(specLine(battery)).toBe('R+, L2, 60Ah, 540A');
  });
});
