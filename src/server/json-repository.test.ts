import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJsonRepository, normaliseCode } from './json-repository';
import { battery, fitment, makeDataDir } from './test-fixtures';

let dir: string;
let repo: ReturnType<typeof createJsonRepository>;
beforeEach(async () => {
  dir = await makeDataDir();
  repo = createJsonRepository(dir);
});

describe('vehicle lists', () => {
  it('returns distinct sorted makes per vehicle type', async () => {
    expect(await repo.getMakes('car')).toEqual(['Audi', 'BMW']);
    expect(await repo.getMakes('van')).toEqual(['Fiat']);
    expect(await repo.getMakes('moto')).toEqual([]);
  });
  it('returns models of one make only', async () => {
    expect(await repo.getModels('car', 'BMW')).toEqual(['3 series']);
    expect(await repo.getModels('car', 'Fiat')).toEqual([]);
  });
  it('filters engines by year, inclusive at both edges, and sorts them', async () => {
    const at = async (y?: number) => (await repo.getEngines('car', 'BMW', '3 series', y)).map((e) => e.fitmentId);
    expect(await at()).toEqual(['car-bmw-3-1', 'car-bmw-3-2']);
    expect(await at(2005)).toEqual(['car-bmw-3-1']);
    expect(await at(2011)).toEqual(['car-bmw-3-1', 'car-bmw-3-2']);
    expect(await at(2019)).toEqual(['car-bmw-3-2']);
    expect(await at(2020)).toEqual([]);
    expect((await repo.getEngines('car', 'BMW', '3 series'))[0]).toEqual({ fitmentId: 'car-bmw-3-1', label: 'E90', yearFrom: 2005, yearTo: 2011 });
  });
});

describe('matching', () => {
  it('returns tier-ordered matches for a fitment and [] for an unknown id', async () => {
    const r = await repo.findBatteriesForFitment('car-bmw-3-2');
    expect(r.map((m) => m.battery.id)).toEqual(['s60']);
    expect(await repo.findBatteriesForFitment('nope')).toEqual([]);
  });
  it('never offers inactive batteries', async () => {
    await repo.upsertBattery(battery({ id: 'old', active: false }), 'test');
    expect((await repo.findBatteriesForFitment('car-bmw-3-2')).map((m) => m.battery.id)).not.toContain('old');
  });
});

describe('old code lookup', () => {
  it('normalises case, spaces, dashes and dots on both sides', async () => {
    expect(normaliseCode(' 0 092-s50.080 ')).toBe('0092S50080');
    expect((await repo.findByOldCode('0 092-s50.080')).map((b) => b.id)).toEqual(['s60']);
    expect((await repo.findByOldCode('560409054')).map((b) => b.id)).toEqual(['s60']);
  });
  it('is exact (no prefix match), skips inactive batteries and empty codes', async () => {
    expect(await repo.findByOldCode('560 409')).toEqual([]);
    expect(await repo.findByOldCode('9 999 OLD')).toEqual([]);
    expect(await repo.findByOldCode(' - . ')).toEqual([]);
  });
});

describe('write side', () => {
  const read = async (f: string) => JSON.parse(await readFile(path.join(dir, f), 'utf8'));
  it('persists an upsert, keeps formatting, and logs create then update with before/after', async () => {
    await repo.upsertBattery(battery({ id: 'new', price: 100 }), 'admin');
    await repo.upsertBattery(battery({ id: 'new', price: 120 }), 'admin');
    expect((await read('batteries.json')).find((b: { id: string }) => b.id === 'new').price).toBe(120);
    expect((await readFile(path.join(dir, 'batteries.json'), 'utf8')).endsWith('}\n]\n')).toBe(true);
    const log = await repo.listChanges(10);
    expect(log.map((c) => c.action)).toEqual(['update', 'create']);
    expect(log[0]).toMatchObject({ entity: 'battery', id: 'new', by: 'admin', before: { price: 100 }, after: { price: 120 } });
    expect(log[1].before).toBeNull();
  });
  it('a second repository instance sees the data (reload by mtime)', async () => {
    await repo.upsertFitment(fitment({ id: 'car-new-1', make: 'Kia', model: 'Rio' }), 'admin');
    expect(await createJsonRepository(dir).getMakes('car')).toContain('Kia');
  });
  it('picks up an external edit of the file', async () => {
    await repo.getMakes('car');
    await new Promise((r) => setTimeout(r, 20));
    await writeFile(path.join(dir, 'fitments.json'), JSON.stringify([fitment({ id: 'x', make: 'Opel', model: 'Astra' })]));
    expect(await repo.getMakes('car')).toEqual(['Opel']);
  });
  it('delete removes the row and logs it; deleting a missing id is a no-op', async () => {
    await repo.deleteBattery('e70', 'admin');
    await repo.deleteBattery('does-not-exist', 'admin');
    expect((await repo.listBatteries()).map((b) => b.id)).toEqual(['s60', 'old']);
    const log = await repo.listChanges(10);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: 'delete', id: 'e70', after: null });
  });
  it('parallel upserts all survive', async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.upsertBattery(battery({ id: `p${i}` }), 'admin')));
    const ids = (await repo.listBatteries()).map((b) => b.id);
    for (let i = 0; i < 25; i++) expect(ids).toContain(`p${i}`);
    expect(await repo.listChanges(100)).toHaveLength(25);
    expect((await read('batteries.json')).length).toBe(3 + 25);
  });
  it('limits and orders the change log newest first', async () => {
    for (let i = 0; i < 3; i++) await repo.upsertBattery(battery({ id: `c${i}` }), 'admin');
    expect((await repo.listChanges(2)).map((c) => c.id)).toEqual(['c2', 'c1']);
  });
});

describe('broken data', () => {
  it('throws a clear error instead of returning partial data', async () => {
    await writeFile(path.join(dir, 'batteries.json'), '{not json');
    await expect(repo.getBattery('s60')).rejects.toThrow(/not valid JSON/);
    await writeFile(path.join(dir, 'fitments.json'), '{"a":1}');
    await expect(repo.getMakes('car')).rejects.toThrow(/must contain an array/);
    await expect(createJsonRepository(path.join(dir, 'missing')).getMakes('car')).rejects.toThrow(/missing or unreadable/);
  });
});
