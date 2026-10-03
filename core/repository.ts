import type { Battery, Fitment, VehicleType } from './types.ts';

// The ONLY door to the data. v1: JSON files on disk. Later: Firestore (Admin SDK, server-side only).
// API routes and the admin panel depend on this interface — never on a concrete store.

export interface EngineOption { fitmentId: string; label: string; yearFrom: number; yearTo: number }

export interface ReadRepository {
  getMakes(type: VehicleType): Promise<string[]>;
  getModels(type: VehicleType, make: string): Promise<string[]>;
  /** Engines of one model; when `year` is given only variants covering that year. */
  getEngines(type: VehicleType, make: string, model: string, year?: number): Promise<EngineOption[]>;
  getFitment(id: string): Promise<Fitment | null>;
  /** Public finder entry point: full combo in, matching batteries out (via matchBatteries). */
  findBatteriesForFitment(fitmentId: string): Promise<import('./types.ts').Match[]>;
  /** Reverse lookup by the code printed on the old battery. Exact, case/space-insensitive. */
  findByOldCode(code: string): Promise<Battery[]>;
  getBattery(id: string): Promise<Battery | null>;
}

export interface ChangeEntry { at: string; by: string; action: 'create' | 'update' | 'delete'; entity: 'battery' | 'fitment'; id: string; before: unknown; after: unknown }

export interface WriteRepository {
  upsertBattery(b: Battery, by: string): Promise<void>;
  upsertFitment(f: Fitment, by: string): Promise<void>;
  deleteBattery(id: string, by: string): Promise<void>;
  deleteFitment(id: string, by: string): Promise<void>;
  listBatteries(): Promise<Battery[]>;              // admin only
  listFitments(): Promise<Fitment[]>;               // admin only
  listChanges(limit: number): Promise<ChangeEntry[]>;
}
