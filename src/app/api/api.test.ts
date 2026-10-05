import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonRepository } from '@/server/json-repository';
import { setRepositoryForTests } from '@/server/repository';
import { battery, makeDataDir } from '@/server/test-fixtures';
import { GET as catalog } from './catalog/route';
import { GET as engines } from './vehicles/engines/route';
import { GET as makes } from './vehicles/makes/route';
import { GET as models } from './vehicles/models/route';
import { GET as match } from './match/route';
import { GET as oldCode } from './old-code/route';

const call = (handler: (r: Request) => Promise<Response>, query: string) => handler(new Request(`http://localhost/api/x?${query}`));
const json = async (res: Response) => res.json();

beforeEach(async () => {
  setRepositoryForTests(createJsonRepository(await makeDataDir()));
});
afterEach(() => {
  setRepositoryForTests(null);
  vi.restoreAllMocks();
});

describe('happy paths', () => {
  it('makes', async () => {
    const res = await call(makes, 'type=car');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(await json(res)).toEqual({ makes: ['Audi', 'BMW'] });
  });
  it('models', async () => expect(await json(await call(models, 'type=car&make=BMW'))).toEqual({ models: ['3 series'] }));
  it('engines with and without year', async () => {
    expect((await json(await call(engines, 'type=car&make=BMW&model=3%20series'))).engines).toHaveLength(2);
    expect((await json(await call(engines, 'type=car&make=BMW&model=3%20series&year=2005'))).engines.map((e: { fitmentId: string }) => e.fitmentId)).toEqual(['car-bmw-3-1']);
  });
  it('match returns public matches with spec and tier', async () => {
    const body = await json(await call(match, 'fitmentId=car-bmw-3-2'));
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({ id: 's60', tier: 'oem', spec: 'R+, L2, 60Ah, 540A', price: 215, quantity: 5, stock: 'in' });
  });
  it('old-code finds by normalised code', async () => {
    const body = await json(await call(oldCode, 'code=0%20092-s50.080'));
    expect(body.results.map((b: { id: string }) => b.id)).toEqual(['s60']);
  });
  it('unknown vehicle or fitment is a 200 with an empty list, not a 404', async () => {
    expect(await json(await call(models, 'type=car&make=Nope'))).toEqual({ models: [] });
    expect(await json(await call(match, 'fitmentId=nope'))).toEqual({ results: [] });
    expect((await call(match, 'fitmentId=nope')).status).toBe(200);
  });
  it('ignores unknown extra params', async () => {
    expect((await call(makes, 'type=car&foo=bar')).status).toBe(200);
  });
});

describe('input validation → 400 invalid_request', () => {
  const bad: [string, (r: Request) => Promise<Response>, string][] = [
    ['makes: missing type', makes, ''],
    ['makes: unknown type', makes, 'type=boat'],
    ['models: missing make', models, 'type=car'],
    ['models: empty make', models, 'type=car&make='],
    ['models: make too long', models, `type=car&make=${'a'.repeat(61)}`],
    ['models: control char', models, 'type=car&make=BM%00W'],
    ['engines: year not 4 digits', engines, 'type=car&make=BMW&model=X&year=99'],
    ['engines: year text', engines, 'type=car&make=BMW&model=X&year=abcd'],
    ['engines: year out of range', engines, 'type=car&make=BMW&model=X&year=1800'],
    ['engines: empty year', engines, 'type=car&make=BMW&model=X&year='],
    ['engines: hex year sneaks through Number()', engines, 'type=car&make=BMW&model=X&year=0x7D5'],
    ['engines: exponent year', engines, 'type=car&make=BMW&model=X&year=2e3'],
    ['engines: decimal year', engines, 'type=car&make=BMW&model=X&year=20.5'],
    ['match: bad id chars', match, 'fitmentId=../etc/passwd'],
    ['match: uppercase id', match, 'fitmentId=CAR-1'],
    ['match: missing', match, ''],
    ['old-code: too short', oldCode, 'code=ab'],
    ['old-code: too long', oldCode, `code=${'1'.repeat(41)}`],
    ['old-code: missing', oldCode, ''],
  ];
  it.each(bad)('%s', async (_name, handler, query) => {
    const res = await call(handler, query);
    expect(res.status).toBe(400);
    expect(await json(res)).toEqual({ error: 'invalid_request' });
  });
});

describe('server errors', () => {
  it('returns a generic 500 and logs server-side only', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setRepositoryForTests({ getMakes: () => Promise.reject(new Error('secret path /data/x')) } as never);
    const res = await call(makes, 'type=car');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe('{"error":"server_error"}');
    expect(text).not.toContain('secret');
    expect(spy).toHaveBeenCalled();
  });
});

describe('catalogue endpoint', () => {
  it('lists active batteries in catalogue order with the shared cache header', async () => {
    const res = await call(catalog, '');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect((await json(res)).batteries.map((b: { id: string }) => b.id)).toEqual(['e70', 's60']);
  });
  it('filters by segment and tech, ignores unknown params', async () => {
    expect((await json(await call(catalog, 'tech=EFB'))).batteries.map((b: { id: string }) => b.id)).toEqual(['e70']);
    expect((await json(await call(catalog, 'segment=car&tech=SMF'))).batteries.map((b: { id: string }) => b.id)).toEqual(['s60']);
    expect((await json(await call(catalog, 'segment=car&foo=bar'))).batteries).toHaveLength(2);
    expect((await json(await call(catalog, ''))).batteries).toHaveLength(2);
  });
  it('bad filter values are 400 invalid_request', async () => {
    for (const q of ['tech=nope', 'segment=boat', 'tech=', 'segment=']) {
      const res = await call(catalog, q);
      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({ error: 'invalid_request' });
    }
  });
  it('never leaks private fields, never shows inactive batteries, quantity only when known', async () => {
    const dir = await makeDataDir({
      batteries: [
        battery({ id: 's60', oemCodes: ['QQ 888 999'], costPrice: 77777 }),
        battery({ id: 'unk', name: 'Unknown', quantity: undefined }),
        battery({ id: 'dead', name: 'Dead', active: false, oemCodes: ['DEAD 001'], costPrice: 1 }),
      ],
    });
    setRepositoryForTests(createJsonRepository(dir));
    const body = await (await call(catalog, '')).text();
    expect(body).toContain('"id":"s60"');
    expect(body).toContain('"id":"unk"');
    expect(body).not.toContain('"id":"dead"');
    for (const forbidden of ['costPrice', '77777', 'oemCodes', 'QQ 888', 'DEAD 001', 'active', 'verified', 'source']) {
      expect(body).not.toContain(forbidden);
    }
    const batteries = JSON.parse(body).batteries as { id: string; quantity?: number }[];
    expect(batteries.find((b) => b.id === 's60')).toMatchObject({ quantity: 5 });
    expect(batteries.find((b) => b.id === 'unk')).not.toHaveProperty('quantity');
  });
});

describe('nothing private leaves the API', () => {
  it('match and old-code bodies never contain private fields', async () => {
    const dir = await makeDataDir({
      batteries: [battery({ id: 's60', oemCodes: ['ZZ 111 222'], costPrice: 99999 })],
    });
    setRepositoryForTests(createJsonRepository(dir));
    const bodies = [
      await (await call(match, 'fitmentId=car-bmw-3-2')).text(),
      await (await call(oldCode, 'code=ZZ111222')).text(),
    ];
    for (const body of bodies) {
      expect(body).toContain('"id":"s60"');
      for (const forbidden of ['costPrice', '99999', 'oemCodes', 'ZZ 111', 'include', 'exclude', 'verified', 'source', 'active', 'ahMin', 'techMin']) {
        expect(body).not.toContain(forbidden);
      }
    }
  });
  it('omits quantity when it is unknown', async () => {
    const dir = await makeDataDir({ batteries: [battery({ id: 's60', quantity: undefined })] });
    setRepositoryForTests(createJsonRepository(dir));
    expect((await json(await call(match, 'fitmentId=car-bmw-3-2'))).results[0]).not.toHaveProperty('quantity');
  });
});
