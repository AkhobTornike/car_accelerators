import { describe, expect, it } from 'vitest';
import { convertRows, formatReport, type Cell } from './import-excel-lib.ts';
import { validateData } from './validate-data.ts';

const bat = (over: Partial<Record<number, Cell>> = {}): Cell[] => {
  const r: Cell[] = ['AMPER S60', 'AMPER', 'მსუბუქი', 'SMF', 60, 540, 'R+', 'L2', 242, 175, 190, 24, 215, 150, 8, '560 409 054, 0 092 S50 080', 'S60.jpg', ''];
  Object.entries(over).forEach(([k, v]) => { r[Number(k)] = v; });
  return r;
};
const fit = (over: Partial<Record<number, Cell>> = {}): Cell[] => {
  const r: Cell[] = ['მსუბუქი', 'Toyota', 'Corolla', '1.6 ბენზინი', 2013, 2018, 'არა', 'AMPER S60', '', '', '', '', '', ''];
  Object.entries(over).forEach(([k, v]) => { r[Number(k)] = v; });
  return r;
};

describe('convertRows', () => {
  it('converts a battery and a fitment and passes the data validator', () => {
    const res = convertRows([bat()], [fit()]);
    expect(res.issues).toEqual([]);
    expect(res.batteries[0]).toMatchObject({ id: 'amper-s60', segment: 'car', tech: 'SMF', polarity: 'R+', stock: 'in', price: 215, costPrice: 150 });
    expect(res.batteries[0].oemCodes).toEqual(['560 409 054', '0 092 S50 080']);
    expect(res.batteries[0]).not.toHaveProperty('quantity');
    expect(res.openingStock).toEqual([{ batteryId: 'amper-s60', qty: 8 }]);
    expect(res.photos).toEqual([{ batteryId: 'amper-s60', file: 'S60.jpg' }]);
    expect(res.fitments[0]).toMatchObject({ type: 'car', include: ['amper-s60'], source: 'shop', verified: true });
    expect(res.fitments[0].oem).toMatchObject({ ahMin: 60, ccaMin: 540, polarity: 'R+', caseCode: 'L2', techMin: 'SMF' });
    expect(validateData(res.batteries as never, res.fitments as never).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('skips blank rows and rows marked as examples', () => {
    const res = convertRows([bat({ 17: 'მაგალითი — წაშალეთ' }), Array(18).fill('')], [fit({ 13: 'მაგალითი — წაშალეთ ეს ხაზი' })]);
    expect(res.batteries).toEqual([]);
    expect(res.fitments).toEqual([]);
    expect(res.issues).toEqual([]);
  });

  it('reports broken battery rows in Georgian with the spreadsheet row number', () => {
    const res = convertRows([bat({ 4: 'abc', 6: 'X+', 2: 'ავტო' })], []);
    const msgs = res.issues.map((i) => i.message).join('\n');
    expect(res.batteries).toEqual([]);
    expect(res.issues.every((i) => i.row === 2 && i.sheet === 'აკუმულატორები')).toBe(true);
    expect(msgs).toContain('ტიპი');
    expect(msgs).toContain('ტევადობა');
    expect(msgs).toContain('პოლარობა');
  });

  it('warns about a missing price and imports it as "ask us"', () => {
    const res = convertRows([bat({ 12: '' })], []);
    expect(res.batteries[0].price).toBeNull();
    expect(res.issues).toEqual([{ level: 'warning', sheet: 'აკუმულატორები', row: 2, message: expect.stringContaining('ფასი') }]);
  });

  it('marks a zero-stock battery out and makes no opening-stock entry', () => {
    const res = convertRows([bat({ 14: 0 })], []);
    expect(res.batteries[0].stock).toBe('out');
    expect(res.openingStock).toEqual([]);
  });

  it('rejects a duplicate model name and gives unique ids to similar names', () => {
    const dup = convertRows([bat(), bat()], []);
    expect(dup.issues.some((i) => i.row === 3 && i.message.includes('ორჯერ'))).toBe(true);
    const similar = convertRows([bat({ 0: 'AMPER S-60' }), bat({ 0: 'AMPER S60' })], []);
    expect(new Set(similar.batteries.map((b) => b.id)).size).toBe(2);
  });

  it('refuses a fitment that names an unknown battery, with a Georgian message', () => {
    const res = convertRows([bat()], [fit({ 7: 'AMPER S99' })]);
    expect(res.fitments).toEqual([]);
    expect(res.issues[0]).toMatchObject({ sheet: 'მანქანები', row: 2 });
    expect(res.issues[0].message).toContain('AMPER S99');
  });

  it('start-stop raises the minimum technology from SMF to EFB and optional columns override the reference', () => {
    const res = convertRows([bat()], [fit({ 6: 'დიახ', 9: 70, 10: 600, 11: 'l+', 12: 'l3' })]);
    expect(res.fitments[0].startStop).toBe(true);
    expect(res.fitments[0].oem).toMatchObject({ techMin: 'EFB', ahMin: 70, ccaMin: 600, polarity: 'L+', caseCode: 'L3' });
  });

  it('formats a readable report', () => {
    const text = formatReport(convertRows([bat(), bat({ 0: 'AMPER X', 4: '' })], [fit()]));
    expect(text).toContain('აკუმულატორი: 1');
    expect(text).toContain('სტრიქონი 3');
  });
});
