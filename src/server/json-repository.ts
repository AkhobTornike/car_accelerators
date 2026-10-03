import type { ChangeEntry, EngineOption, ReadRepository, WriteRepository } from '@core/repository';
import { matchBatteries, yearInRange } from '@core/fitment-engine';
import type { Battery, Fitment, VehicleType } from '@core/types';
import { JsonStore } from './json-store';

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/[\s.\-]/g, '');

const byText = (a: string, b: string) => a.localeCompare(b);
const distinct = (xs: string[]) => [...new Set(xs)].sort(byText);

export function createJsonRepository(dataDirOrStore: string | JsonStore): ReadRepository & WriteRepository {
  const store = typeof dataDirOrStore === 'string' ? new JsonStore(dataDirOrStore) : dataDirOrStore;
  const batteries = () => store.read<Battery>('batteries');
  const fitments = () => store.read<Fitment>('fitments');
  const sameCar = (type: VehicleType, make: string, model?: string) => (f: Fitment) =>
    f.type === type && f.make === make && (model === undefined || f.model === model);

  async function upsert<T extends { id: string }>(collection: 'batteries' | 'fitments', row: T, by: string) {
    await store.withLock(async () => {
      const rows = await store.read<T>(collection);
      const i = rows.findIndex((r) => r.id === row.id);
      const before = i >= 0 ? rows[i] : null;
      const next = i >= 0 ? rows.map((r, k) => (k === i ? row : r)) : [...rows, row];
      await store.write(collection, next);
      await logChange(collection === 'batteries' ? 'battery' : 'fitment', i >= 0 ? 'update' : 'create', row.id, before, row, by);
    });
  }

  async function remove(collection: 'batteries' | 'fitments', id: string, by: string) {
    await store.withLock(async () => {
      const rows = await store.read<{ id: string }>(collection);
      const before = rows.find((r) => r.id === id);
      if (!before) return;
      await store.write(collection, rows.filter((r) => r.id !== id));
      await logChange(collection === 'batteries' ? 'battery' : 'fitment', 'delete', id, before, null, by);
    });
  }

  // Only call inside withLock.
  async function logChange(entity: ChangeEntry['entity'], action: ChangeEntry['action'], id: string, before: unknown, after: unknown, by: string) {
    const log = await store.read<ChangeEntry>('changes', { optional: true });
    await store.write('changes', [...log, { at: new Date().toISOString(), by, action, entity, id, before, after }]);
  }

  return {
    async getMakes(type) {
      return distinct((await fitments()).filter((f) => f.type === type).map((f) => f.make));
    },
    async getModels(type, make) {
      return distinct((await fitments()).filter(sameCar(type, make)).map((f) => f.model));
    },
    async getEngines(type, make, model, year) {
      const rows = (await fitments()).filter(sameCar(type, make, model)).filter((f) => year === undefined || yearInRange(f, year));
      const options: EngineOption[] = rows.map((f) => ({ fitmentId: f.id, label: f.engine, yearFrom: f.yearFrom, yearTo: f.yearTo }));
      return options.sort((a, b) => byText(a.label, b.label) || a.yearFrom - b.yearFrom);
    },
    async getFitment(id) {
      return (await fitments()).find((f) => f.id === id) ?? null;
    },
    async findBatteriesForFitment(fitmentId) {
      const f = (await fitments()).find((x) => x.id === fitmentId);
      if (!f) return [];
      return matchBatteries(f, (await batteries()).filter((b) => b.active));
    },
    async findByOldCode(code) {
      const wanted = normaliseCode(code);
      if (!wanted) return [];
      return (await batteries()).filter((b) => b.active && b.oemCodes.some((c) => normaliseCode(c) === wanted));
    },
    async getBattery(id) {
      return (await batteries()).find((b) => b.id === id) ?? null;
    },
    upsertBattery: (b, by) => upsert('batteries', b, by),
    upsertFitment: (f, by) => upsert('fitments', f, by),
    deleteBattery: (id, by) => remove('batteries', id, by),
    deleteFitment: (id, by) => remove('fitments', id, by),
    listBatteries: () => batteries(),
    listFitments: () => fitments(),
    async listChanges(limit) {
      return (await store.read<ChangeEntry>('changes', { optional: true })).slice(-limit).reverse();
    },
  };
}
