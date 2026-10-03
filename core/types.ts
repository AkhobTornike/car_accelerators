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
  stock: Stock;
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
