import type { Battery, Fitment, NewSale, Sale, SaleVoid, StockMovement, VehicleType } from './types.ts';

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
  /** Active batteries only, cheap to call often (cached on Firestore). Public-safe filtering is the caller's job (see public-dto). */
  listActiveBatteries(): Promise<Battery[]>;
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

export interface DateRange { from?: string; to?: string }   // ISO; `to` exclusive

/** Admin-only. Every method that changes stock is ONE atomic unit: sale/void/receive/adjust write the
 *  ledger entries AND update Battery.quantity/stock together (Firestore transaction later; serialised file write now).
 *  Sales and movements are append-only — there is no update or delete for them. */
export interface InventoryRepository {
  /** Checks with checkSale(), throws InsufficientStockError / Error listing the problems; returns the stored Sale. */
  recordSale(input: NewSale): Promise<Sale>;
  /** Undo a sale: stores a SaleVoid and returns the stock. Throws if already voided. */
  voidSale(saleId: string, reason: string): Promise<SaleVoid>;
  receiveStock(batteryId: string, qty: number, opts?: { unitCost?: number | null; note?: string }): Promise<StockMovement>;
  /** Set the real counted quantity; records the difference as an 'adjust' movement (no-op error if equal). */
  adjustStock(batteryId: string, countedQuantity: number, note?: string): Promise<StockMovement>;
  /** New product. `initialQuantity` becomes an 'initial' ledger movement (quantity is never set directly). Throws 'conflict' if the id exists. */
  createBattery(battery: Omit<Battery, 'quantity'>, initialQuantity: number | undefined, by: string): Promise<Battery>;
  /** Change catalogue fields of a product. `quantity` is NOT taken from the input — it only moves through the ledger. Throws 'not_found'. */
  updateBattery(id: string, fields: Partial<Omit<Battery, 'id' | 'quantity'>>, by: string): Promise<Battery>;
  /**
   * Delete a product for good. Refused with 'has_history' when it has any stock movement (and therefore any sale):
   * the ledger and old sales must stay readable — hide it instead (updateBattery with active:false).
   * On success its id is also removed from every fitment's include/exclude list.
   */
  removeBattery(id: string, by: string): Promise<{ removedFromFitments: number }>;
  getSale(id: string): Promise<Sale | null>;
  listSales(range?: DateRange): Promise<{ sales: Sale[]; voids: SaleVoid[] }>;
  listMovements(opts?: { batteryId?: string; range?: DateRange; limit?: number }): Promise<StockMovement[]>;
}
