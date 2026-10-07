import { describe, expect, it } from 'vitest';
import { explainRejections, matchBatteries, specLine, yearInRange } from './fitment-engine.ts';
import type { Battery, Fitment } from './types.ts';

const bat = (o: Partial<Battery> & { id: string }): Battery => ({
  brand: 'AMPER', name: o.id, segment: 'car', tech: 'SMF', voltage: 12, ah: 60, cca: 540, polarity: 'R+',
  caseCode: 'L2', dimsMm: { l: 242, w: 175, h: 190 }, warrantyMonths: 24, price: 200, stock: 'in',
  oemCodes: [], active: true, ...o,
});

const fit = (o: Partial<Fitment> = {}, oem: Partial<Fitment['oem']> = {}): Fitment => ({
  id: 'f1', type: 'car', make: 'Test', model: 'T', engine: '1.6', yearFrom: 2010, yearTo: 2015, startStop: false,
  oem: { ahMin: 60, ccaMin: 540, polarity: 'R+', caseCode: 'L2', techMin: 'SMF', ...oem },
  source: 'demo', verified: false, ...o,
});

const ids = (f: Fitment, bs: Battery[]) => matchBatteries(f, bs).map((m) => m.battery.id);
const why = (f: Fitment, b: Battery) => explainRejections(f, [b])[0]?.reasons ?? [];

describe('hard rules', () => {
  it('accepts an exact OEM-equivalent battery', () => {
    const [m] = matchBatteries(fit(), [bat({ id: 'a' })]);
    expect(m.tier).toBe('oem');
    expect(m.notes).toEqual([]);
  });
  it('rejects wrong polarity', () => expect(why(fit(), bat({ id: 'a', polarity: 'L+' }))).toEqual(['polarity']));
  it('rejects wrong case code', () => expect(why(fit(), bat({ id: 'a', caseCode: 'L3' }))).toEqual(['case']));
  it('rejects wrong hold-down and terminal only when the OEM spec names them', () => {
    expect(why(fit(), bat({ id: 'a', holdDown: 'B14', terminal: 'thin' }))).toEqual([]);
    expect(why(fit({}, { holdDown: 'B13' }), bat({ id: 'a', holdDown: 'B14' }))).toEqual(['holddown']);
    expect(why(fit({}, { terminal: 'thin' }), bat({ id: 'a' }))).toEqual(['terminal']);
  });
  it('rejects inactive batteries and wrong voltage', () => {
    expect(why(fit(), bat({ id: 'a', active: false }))).toEqual(['inactive']);
    expect(why(fit(), bat({ id: 'a', voltage: 24 }))).toEqual(['voltage']);
  });
  it('rejects too low CCA', () => expect(why(fit(), bat({ id: 'a', cca: 539 }))).toEqual(['cca-low']));
});

describe('capacity window', () => {
  it('rejects below ahMin and above +25%, accepts both edges', () => {
    expect(why(fit(), bat({ id: 'a', ah: 59 }))).toEqual(['ah-low']);
    expect(why(fit(), bat({ id: 'a', ah: 75 }))).toEqual([]);
    expect(why(fit(), bat({ id: 'a', ah: 76 }))).toEqual(['ah-high']);
  });
  it('explicit ahMax overrides the factor', () => {
    expect(why(fit({}, { ahMax: 62 }), bat({ id: 'a', ah: 63 }))).toEqual(['ah-high']);
    expect(why(fit({}, { ahMax: 80 }), bat({ id: 'a', ah: 76 }))).toEqual([]);
  });
});

describe('technology', () => {
  it('start-stop needs EFB or AGM', () => {
    const f = fit({ startStop: true });
    expect(why(f, bat({ id: 'a', tech: 'SMF' }))).toEqual(['tech']);
    expect(why(f, bat({ id: 'a', tech: 'EFB' }))).toEqual([]);
    expect(why(f, bat({ id: 'a', tech: 'AGM' }))).toEqual([]);
  });
  it('techMin AGM rejects EFB; DEEP-CYCLE never qualifies', () => {
    expect(why(fit({}, { techMin: 'AGM' }), bat({ id: 'a', tech: 'EFB' }))).toEqual(['tech']);
    expect(why(fit(), bat({ id: 'a', tech: 'DEEP-CYCLE' }))).toEqual(['tech']);
  });
});

describe('size fallback and segments', () => {
  const noCase = fit({}, { caseCode: undefined, dimsMm: { l: 242, w: 175, h: 190 } });
  it('uses dimensions ±2 mm when the OEM case code is unknown', () => {
    expect(why(noCase, bat({ id: 'a', dimsMm: { l: 244, w: 173, h: 190 } }))).toEqual([]);
    expect(why(noCase, bat({ id: 'a', dimsMm: { l: 245, w: 175, h: 190 } }))).toEqual(['dims']);
  });
  it('no size info on the OEM side cannot be confirmed', () => {
    expect(why(fit({}, { caseCode: undefined }), bat({ id: 'a' }))).toEqual(['case']);
  });
  it('segment must fit the vehicle type; vans may take car and truck batteries', () => {
    expect(why(fit(), bat({ id: 'a', segment: 'truck' }))).toEqual(['segment']);
    expect(why(fit({ type: 'van' }), bat({ id: 'a', segment: 'truck' }))).toEqual([]);
    expect(why(fit({ type: 'van' }), bat({ id: 'a', segment: 'moto' }))).toEqual(['segment']);
  });
});

describe('tiers', () => {
  it('+10% Ah and +14% CCA is still OEM-equivalent', () => {
    expect(matchBatteries(fit(), [bat({ id: 'a', ah: 66, cca: 615 })])[0].tier).toBe('oem');
  });
  it('flags upgrades with notes', () => {
    const f = fit();
    expect(matchBatteries(f, [bat({ id: 'a', ah: 67 })])[0]).toMatchObject({ tier: 'upgrade', notes: ['higher-capacity'] });
    expect(matchBatteries(f, [bat({ id: 'a', cca: 622 })])[0]).toMatchObject({ tier: 'upgrade', notes: ['higher-cca'] });
    expect(matchBatteries(f, [bat({ id: 'a', tech: 'AGM' })])[0]).toMatchObject({ tier: 'upgrade', notes: ['tech-upgrade'] });
  });
  it('AGM on a start-stop car that needs EFB is a tech upgrade', () => {
    const [m] = matchBatteries(fit({ startStop: true }), [bat({ id: 'a', tech: 'AGM' })]);
    expect(m.notes).toContain('tech-upgrade');
  });
});

describe('ranking', () => {
  it('orders by tier, then stock, then price (null last), then id', () => {
    const bs = [
      bat({ id: 'up-cheap', ah: 70, price: 100 }),
      bat({ id: 'oem-order', stock: 'order', price: 50 }),
      bat({ id: 'oem-ask', price: null }),
      bat({ id: 'oem-dear', price: 300 }),
      bat({ id: 'oem-cheap', price: 150 }),
      bat({ id: 'oem-out', stock: 'out', price: 10 }),
    ];
    expect(ids(fit(), bs)).toEqual(['oem-cheap', 'oem-dear', 'oem-ask', 'oem-order', 'oem-out', 'up-cheap']);
  });
  it('marks order-only and out-of-stock', () => {
    const r = matchBatteries(fit(), [bat({ id: 'a', stock: 'order' }), bat({ id: 'b', stock: 'out' })]);
    expect(r.find((m) => m.battery.id === 'a')!.notes).toEqual(['order-only']);
    expect(r.find((m) => m.battery.id === 'b')!.notes).toEqual(['out-of-stock']);
  });
});

describe('shop overrides', () => {
  it('exclude beats everything', () => {
    expect(ids(fit({ exclude: ['a'], include: ['a'] }), [bat({ id: 'a' })])).toEqual([]);
  });
  it('include pins a battery that fails the rules, but not an inactive one', () => {
    const f = fit({ include: ['x', 'y'] });
    const out = matchBatteries(f, [bat({ id: 'x', polarity: 'L+' }), bat({ id: 'y', active: false })]);
    expect(out.map((m) => m.battery.id)).toEqual(['x']);
    expect(out[0]).toMatchObject({ tier: 'oem', notes: ['pinned'] });
  });
});

describe('helpers', () => {
  it('formats the spec line shown to customers', () => expect(specLine(bat({ id: 'a' }))).toBe('R+, L2, 60Ah, 540A'));
  it('explainRejections lists every failing rule', () => {
    expect(why(fit(), bat({ id: 'a', polarity: 'L+', ah: 50, cca: 100 }))).toEqual(['polarity', 'ah-low', 'cca-low']);
  });
  it('year range is inclusive', () => {
    const f = fit();
    expect([2009, 2010, 2015, 2016].map((y) => yearInRange(f, y))).toEqual([false, true, true, false]);
  });
});

describe('estimated fitments (generated from public engine data)', () => {
  const est = (oem: Partial<Fitment['oem']> = {}) =>
    fit({ source: 'estimated', verified: false }, { polarity: undefined, caseCode: undefined, ...oem });
  it('ignores polarity and case, still checks Ah, CCA and technology, and always says "confirm the fit"', () => {
    const [m] = matchBatteries(est(), [bat({ id: 'a', polarity: 'L+', caseCode: 'L3' })]);
    expect(m.notes).toContain('confirm-fit');
    expect(why(est(), bat({ id: 'a', ah: 59 }))).toEqual(['ah-low']);
    expect(why(est(), bat({ id: 'a', cca: 100 }))).toEqual(['cca-low']);
    expect(why(est({ techMin: 'EFB' }), bat({ id: 'a', tech: 'SMF' }))).toEqual(['tech']);
  });
  it('a shop-sourced fitment with no size information still cannot be confirmed', () => {
    expect(why(fit({ source: 'shop' }, { caseCode: undefined }), bat({ id: 'a' }))).toEqual(['case']);
  });
  it('a pinned battery on an estimated fitment is also marked "confirm the fit"', () => {
    const [m] = matchBatteries({ ...est(), include: ['a'] }, [bat({ id: 'a', polarity: 'L+' })]);
    expect(m.notes).toEqual(expect.arrayContaining(['pinned', 'confirm-fit']));
  });
});
