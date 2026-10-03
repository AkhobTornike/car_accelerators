export type VehicleType = 'car' | 'van' | 'truck' | 'moto';
export type Stock = 'in' | 'order' | 'out';
export type Tech = 'SMF' | 'EFB' | 'AGM' | 'DEEP-CYCLE';
export type Tier = 'oem' | 'upgrade';
export type Note = 'tech-upgrade' | 'higher-capacity' | 'higher-cca' | 'pinned' | 'order-only' | 'out-of-stock';

export interface DimsMm {
  l: number;
  w: number;
  h: number;
}

export interface EngineOption {
  fitmentId: string;
  label: string;
  yearFrom: number;
  yearTo: number;
}

export interface PublicBattery {
  id: string;
  name: string;
  brand: string;
  tech: Tech;
  ah: number;
  cca: number;
  polarity: 'L+' | 'R+';
  caseCode: string;
  dimsMm: DimsMm;
  warrantyMonths: number;
  price: number | null;
  stock: Stock;
  quantity?: number;
}

export interface PublicMatch extends PublicBattery {
  tier: Tier;
  spec: string;
  notes: Note[];
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, url: string) {
    super(`request failed with status ${status}: ${url}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new ApiError(res.status, url);
  return (await res.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) p.set(k, String(v));
  }
  return p.toString();
}

export function getMakes(type: VehicleType, signal?: AbortSignal): Promise<string[]> {
  return getJson<{ makes: string[] }>(`/api/vehicles/makes?${query({ type })}`, signal).then((b) => b.makes);
}

export function getModels(type: VehicleType, make: string, signal?: AbortSignal): Promise<string[]> {
  return getJson<{ models: string[] }>(`/api/vehicles/models?${query({ type, make })}`, signal).then((b) => b.models);
}

export function getEngines(
  type: VehicleType,
  make: string,
  model: string,
  year?: number,
  signal?: AbortSignal,
): Promise<EngineOption[]> {
  return getJson<{ engines: EngineOption[] }>(
    `/api/vehicles/engines?${query({ type, make, model, year })}`,
    signal,
  ).then((b) => b.engines);
}

export function getMatches(fitmentId: string, signal?: AbortSignal): Promise<PublicMatch[]> {
  return getJson<{ results: PublicMatch[] }>(`/api/match?${query({ fitmentId })}`, signal).then((b) => b.results);
}

export function searchByOldCode(code: string, signal?: AbortSignal): Promise<PublicBattery[]> {
  return getJson<{ results: PublicBattery[] }>(`/api/old-code?${query({ code })}`, signal).then((b) => b.results);
}
