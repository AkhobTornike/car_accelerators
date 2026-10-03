import path from 'node:path';
import type { ReadRepository, WriteRepository } from '@core/repository';
import { createJsonRepository } from './json-repository';

type Repository = ReadRepository & WriteRepository;
let instance: Repository | null = null;

export function getRepository(): Repository {
  instance ??= createJsonRepository(process.env.DATA_DIR ?? path.join(process.cwd(), 'data'));
  return instance;
}

export function setRepositoryForTests(repo: Repository | null) {
  instance = repo;
}
