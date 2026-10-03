import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Battery, Fitment } from '@core/types';

export const battery = (o: Partial<Battery> & { id: string }): Battery => ({
  brand: 'AMPER', name: o.id, segment: 'car', tech: 'SMF', voltage: 12, ah: 60, cca: 540, polarity: 'R+', caseCode: 'L2',
  dimsMm: { l: 242, w: 175, h: 190 }, warrantyMonths: 24, price: 200, costPrice: 120, stock: 'in', quantity: 5,
  oemCodes: [], active: true, ...o,
});

export const fitment = (o: Partial<Fitment> & { id: string }, oem: Partial<Fitment['oem']> = {}): Fitment => ({
  type: 'car', make: 'BMW', model: '3 series', engine: 'F30', yearFrom: 2012, yearTo: 2019, startStop: false,
  oem: { ahMin: 60, ccaMin: 540, polarity: 'R+', caseCode: 'L2', techMin: 'SMF', ...oem },
  source: 'demo', verified: false, ...o,
});

export const FIXTURE_BATTERIES: Battery[] = [
  battery({ id: 's60', name: 'S60', oemCodes: ['0 092 S50 080', '560 409 054'], price: 215 }),
  battery({ id: 'e70', name: 'E70', tech: 'EFB', ah: 70, cca: 640, caseCode: 'L3', stock: 'order', quantity: 0, price: 315 }),
  battery({ id: 'old', name: 'Old', oemCodes: ['9 999 OLD'], active: false }),
];

export const FIXTURE_FITMENTS: Fitment[] = [
  fitment({ id: 'car-bmw-3-1', engine: 'E90', yearFrom: 2005, yearTo: 2011 }),
  fitment({ id: 'car-bmw-3-2', engine: 'F30', yearFrom: 2011, yearTo: 2019 }),
  fitment({ id: 'car-audi-a3-1', make: 'Audi', model: 'A3', engine: '8V', startStop: true }, { techMin: 'EFB', caseCode: 'L3', ahMin: 70, ccaMin: 640 }),
  fitment({ id: 'van-fiat-doblo-1', type: 'van', make: 'Fiat', model: 'Doblo', engine: '1.3 MJT' }),
];

export async function makeDataDir(opts: { batteries?: Battery[]; fitments?: Fitment[] } = {}): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'amper-data-'));
  await writeFile(path.join(dir, 'batteries.json'), JSON.stringify(opts.batteries ?? FIXTURE_BATTERIES));
  await writeFile(path.join(dir, 'fitments.json'), JSON.stringify(opts.fitments ?? FIXTURE_FITMENTS));
  return dir;
}
