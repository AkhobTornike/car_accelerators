import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** One JSON file = one collection (an array). Cached by mtime; writes are serialised and atomic. */
export class JsonStore {
  private cache = new Map<string, { mtimeMs: number; rows: unknown[] }>();
  private tail: Promise<unknown> = Promise.resolve();

  constructor(readonly dir: string) {}

  private file(name: string) {
    return path.join(this.dir, `${name}.json`);
  }

  async read<T>(name: string, opts: { optional?: boolean } = {}): Promise<T[]> {
    const file = this.file(name);
    let mtimeMs: number;
    try {
      mtimeMs = (await fs.stat(file)).mtimeMs;
    } catch (e) {
      if (opts.optional && (e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new Error(`data file missing or unreadable: ${file}`);
    }
    const hit = this.cache.get(name);
    if (hit && hit.mtimeMs === mtimeMs) return hit.rows as T[];
    let rows: unknown;
    try {
      rows = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      throw new Error(`data file is not valid JSON: ${file}`);
    }
    if (!Array.isArray(rows)) throw new Error(`data file must contain an array: ${file}`);
    this.cache.set(name, { mtimeMs, rows });
    return rows as T[];
  }

  /** Runs `fn` after every earlier write finished; a failing write does not block later ones. */
  withLock<R>(fn: () => Promise<R>): Promise<R> {
    const run = this.tail.then(fn);
    this.tail = run.catch(() => undefined);
    return run;
  }

  /** Call only inside withLock. Temp file in the same folder, then rename = atomic replace. */
  async write(name: string, rows: unknown[]): Promise<void> {
    const file = this.file(name);
    const tmp = `${file}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2) + '\n', 'utf8');
    await fs.rename(tmp, file);
    this.cache.set(name, { mtimeMs: (await fs.stat(file)).mtimeMs, rows });
  }
}
