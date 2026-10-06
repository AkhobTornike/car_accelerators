import { afterEach, describe, expect, it } from 'vitest';
import { getPublicCatalog } from './catalog';
import { createJsonRepository } from './json-repository';
import { setRepositoryForTests } from './repository';
import { battery, makeDataDir } from './test-fixtures';

describe('getPublicCatalog', () => {
  afterEach(() => setRepositoryForTests(null));

  it('returns active batteries, public shape only, quantity only when known', async () => {
    setRepositoryForTests(createJsonRepository(await makeDataDir({
      batteries: [
        battery({ id: 's60', oemCodes: ['QQ 888 999'], costPrice: 77777 }),
        battery({ id: 'a-car', tech: 'SMF', ah: 60, quantity: undefined }),
        battery({ id: 'dead', name: 'Dead', active: false, costPrice: 1 }),
      ],
    })));
    const catalog = await getPublicCatalog();
    expect(catalog.map((b) => b.id)).toEqual(['a-car', 's60']);
    for (const b of catalog) {
      expect(Object.keys(b).sort()).toEqual(
        ['ah', 'brand', 'caseCode', 'cca', 'dimsMm', 'id', 'images', 'name', 'polarity', 'price', 'segment', 'stock', 'tech', 'warrantyMonths', ...(b.quantity === undefined ? [] : ['quantity'])].sort(),
      );
    }
    expect(catalog.find((b) => b.id === 's60')).toMatchObject({ quantity: 5, price: 200 });
    expect(catalog.find((b) => b.id === 'a-car')).not.toHaveProperty('quantity');
  });
});
