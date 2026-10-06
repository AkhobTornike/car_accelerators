import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxy } from './proxy';

const at = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));
const rewritten = (res: Response) => res.headers.get('x-middleware-rewrite');
afterEach(() => vi.unstubAllEnvs());

describe('admin path gate', () => {
  it('lets the secret segment through', () => {
    vi.stubEnv('ADMIN_PATH', 'abc123');
    const res = at('/m/abc123');
    expect(rewritten(res)).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(at('/m/abc123/anything').headers.get('x-middleware-next')).toBe('1');
  });
  it('rewrites a wrong, empty or case-different segment to a page that does not exist', () => {
    vi.stubEnv('ADMIN_PATH', 'abc123');
    for (const p of ['/m/nope', '/m/', '/m', '/m/ABC123', '/m/abc1234', '/m/abc12']) {
      expect(rewritten(at(p)), p).toContain('/__no_such_page__');
    }
  });
  it('rejects everything when ADMIN_PATH is not set', () => {
    vi.stubEnv('ADMIN_PATH', '');
    expect(rewritten(at('/m/anything'))).toContain('/__no_such_page__');
    expect(rewritten(at('/m/'))).toContain('/__no_such_page__');
  });
});
