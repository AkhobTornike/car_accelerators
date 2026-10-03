import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getEngines, getMakes, getMatches, getModels, searchByOldCode } from './api-client';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('success paths', () => {
  it('getMakes returns the list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ makes: ['Audi', 'BMW'] })));
    await expect(getMakes('car')).resolves.toEqual(['Audi', 'BMW']);
  });
  it('getMatches returns results', async () => {
    const results = [{ id: 's60', tier: 'oem', spec: 'R+, L2, 60Ah, 540A' }];
    vi.stubGlobal('fetch', vi.fn(async () => ok({ results })));
    await expect(getMatches('car-bmw-3-1')).resolves.toEqual(results);
  });
  it('searchByOldCode returns results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ results: [{ id: 's60' }] })));
    await expect(searchByOldCode('0 092 S50 080')).resolves.toEqual([{ id: 's60' }]);
  });
  it('getEngines omits year when not given', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return ok({ engines: [] });
      }),
    );
    await getEngines('car', 'BMW', '3 series');
    expect(seen[0]).not.toContain('year=');
    await getEngines('car', 'BMW', '3 series', 2015);
    expect(seen[1]).toContain('year=2015');
  });
});

describe('query-string encoding', () => {
  it('encodes spaces in model names', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return ok({ engines: [] });
      }),
    );
    await getEngines('car', 'BMW', '3 series');
    expect(seen[0]).toContain('model=3+series');
  });
  it('encodes non-ASCII makes like Citroën', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return ok({ models: [] });
      }),
    );
    await getModels('car', 'Citroën');
    expect(seen[0]).toContain('make=Citro%C3%ABn');
  });
});

describe('non-2xx responses', () => {
  it('throws ApiError with the status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(400)));
    const err = await getModels('car', '').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
  });
  it('throws on server errors too', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(500)));
    await expect(getMakes('van')).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });
});
