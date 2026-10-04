import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createJsonInventory } from './json-inventory';
import { createJsonRepository } from './json-repository';
import { JsonStore } from './json-store';
import { repositoryContract } from './repository-contract';

repositoryContract('JSON files', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'amper-contract-'));
  await writeFile(path.join(dir, 'batteries.json'), '[]');
  await writeFile(path.join(dir, 'fitments.json'), '[]');
  const store = new JsonStore(dir);
  return { catalogue: createJsonRepository(store), inventory: createJsonInventory(store) };
});
