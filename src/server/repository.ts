import path from 'node:path';
import type { InventoryRepository, ReadRepository, WriteRepository } from '@core/repository';
import { createJsonInventory } from './json-inventory';
import { createJsonRepository } from './json-repository';
import { JsonStore } from './json-store';

type Repository = ReadRepository & WriteRepository;
let instance: { catalogue: Repository; inventory: InventoryRepository | null } | null = null;

function init() {
  // One store for both so catalogue writes and stock writes share the same lock.
  const store = new JsonStore(process.env.DATA_DIR ?? path.join(process.cwd(), 'data'));
  return { catalogue: createJsonRepository(store), inventory: createJsonInventory(store) };
}

export function getRepository(): Repository {
  return (instance ??= init()).catalogue;
}

export function getInventory(): InventoryRepository {
  const i = (instance ??= init());
  if (!i.inventory) throw new Error('inventory repository not configured');
  return i.inventory;
}

export function setRepositoryForTests(repo: Repository | null, inventory: InventoryRepository | null = null) {
  instance = repo ? { catalogue: repo, inventory } : null;
}
