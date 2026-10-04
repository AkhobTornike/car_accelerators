import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateData } from './validate-data.ts';

const dir = path.resolve(process.cwd(), process.argv[2] ?? 'data');
const read = (name: string): unknown[] => {
  const parsed: unknown = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
  if (!Array.isArray(parsed)) {
    console.error(`${name} must contain an array`);
    process.exit(1);
  }
  return parsed;
};

const batteries = read('batteries.json');
const fitments = read('fitments.json');
const issues = validateData(batteries, fitments);
for (const level of ['error', 'warning'] as const) {
  for (const i of issues.filter((x) => x.level === level)) {
    console.log(`[${i.level}] ${i.code} ${i.entity} ${i.id}: ${i.message}`);
  }
}
const errors = issues.filter((i) => i.level === 'error').length;
console.log(`${errors} errors, ${issues.length - errors} warnings, ${batteries.length} batteries, ${fitments.length} fitments`);
process.exit(errors > 0 ? 1 : 0);
