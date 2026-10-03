// Domain contract for the AMPER.GE battery finder.
// Pure types — no framework, no Firebase. Everything else (API, admin, repository) builds on this.

export type Segment = 'car' | 'truck' | 'moto' | 'deep';   // battery segment
export type VehicleType = 'car' | 'van' | 'truck' | 'moto';
export type Tech = 'SMF' | 'EFB' | 'AGM' | 'DEEP-CYCLE';
// Seen from the terminal side with the battery front facing you: where the positive pole sits.
// Convention to be confirmed with the shop before bulk data entry.
export type Polarity = 'L+' | 'R+';
export type Stock = 'in' | 'order' | 'out';

export interface Battery {
  id: string;                       // stable slug, e.g. "s60"
  brand: string;
  name: string;
  segment: Segment;
  tech: Tech;
  voltage: number;                  // 12 for everything in v1
  ah: number;
  cca: number;                      // EN, amps
  polarity: Polarity;
  caseCode: string;                 // EN case code: L1..L5, MOTO, ...
  dimsMm: { l: number; w: number; h: number };
  terminal?: string;                // e.g. "standard", "thin" — only when it matters
  holdDown?: string;                // e.g. "B13", "B14"
  warrantyMonths: number;
  price: number | null;             // GEL; null = "ask us"
  costPrice?: number | null;        // GEL, PRIVATE — admin/reports only, never in a public DTO
  stock: Stock;
  quantity?: number;                // units on the shelf, shown to customers; kept in sync by the stock ledger (core/inventory.ts)
  oemCodes: string[];               // codes printed on the old battery, for reverse lookup
  images?: string[];
  active: boolean;
}

export interface OemSpec {
  ahMin: number;
  ahMax?: number;                   // overrides FITMENT_CONFIG.ahMaxFactor when set
  ccaMin: number;
  polarity: Polarity;
  caseCode?: string;
  dimsMm?: { l: number; w: number; h: number };   // fallback when caseCode is unknown
  terminal?: string;
  holdDown?: string;
  techMin: Exclude<Tech, 'DEEP-CYCLE'>;
}

export interface Fitment {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  engine: string;                   // free label, e.g. "F30 · 316i–320i"
  yearFrom: number;                 // inclusive
  yearTo: number;                   // inclusive
  startStop: boolean;
  oem: OemSpec;
  include?: string[];               // battery ids always offered (pinned by the shop)
  exclude?: string[];               // battery ids never offered
  source: 'shop' | 'manufacturer' | 'demo';
  verified: boolean;                // false until a human confirmed this row
}

export type RejectReason =
  | 'inactive' | 'segment' | 'voltage' | 'polarity' | 'case' | 'dims'
  | 'holddown' | 'terminal' | 'ah-low' | 'ah-high' | 'cca-low' | 'tech' | 'excluded';

export type Tier = 'oem' | 'upgrade';
export type Note = 'tech-upgrade' | 'higher-capacity' | 'higher-cca' | 'pinned' | 'order-only' | 'out-of-stock';

export interface Match {
  battery: Battery;
  tier: Tier;
  spec: string;                     // "R+, L2, 60Ah, 540A" — shown to the customer as the reason
  notes: Note[];
}

export interface Rejection { battery: Battery; reasons: RejectReason[] }

// ---- Inventory & sales (admin only; sales happen offline, the admin records them) ----

export type PaymentMethod = 'cash' | 'transfer' | 'card';

export interface Customer {
  firstName: string;
  lastName: string;
  idNumber?: string;                // personal number (11 digits) or company ID (9 digits)
  iban?: string;                    // at least one of idNumber / iban is required
  phone?: string;
}

export interface SaleLine {
  batteryId: string;
  name: string;                     // snapshot at sale time
  qty: number;
  unitPrice: number;                // GEL, snapshot
  unitCost?: number | null;         // snapshot of costPrice, for margin reports
}

/** Immutable once written. A mistake is undone with a SaleVoid, never by editing. */
export interface Sale {
  id: string;
  soldAt: string;                   // ISO 8601
  customer: Customer;
  lines: SaleLine[];
  discount: number;                 // GEL, total discount on the whole sale (>= 0)
  total: number;                    // sum(qty * unitPrice) - discount
  paymentMethod: PaymentMethod;
  note?: string;
}

export type NewSale = Omit<Sale, 'id' | 'total' | 'soldAt'> & { soldAt?: string };

export interface SaleVoid { id: string; saleId: string; at: string; reason: string }

export type MovementKind = 'initial' | 'receive' | 'sale' | 'sale-void' | 'return' | 'adjust';

/** Append-only stock ledger. Battery.quantity == sum of delta. */
export interface StockMovement {
  id: string;
  at: string;
  batteryId: string;
  delta: number;                    // non-zero integer: + in, - out
  kind: MovementKind;
  saleId?: string;
  unitCost?: number | null;         // for 'receive'
  note?: string;
}

export type NewMovement = Omit<StockMovement, 'id'>;
