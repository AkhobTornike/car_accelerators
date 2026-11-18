import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validAdminSegments } from '@/server/admin-path';
import { resetSecurityStateForTests } from '@/server/security-state';
import { proxy } from './proxy';

const at = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));
const rewritten = (res: Response) => res.headers.get('x-middleware-rewrite');
const passes = async (path: string) => (await at(path)).headers.get('x-middleware-next') === '1';
beforeEach(resetSecurityStateForTests);
afterEach(() => vi.unstubAllEnvs());

describe('admin path gate', () => {
  it('lets the fixed secret segment through when rotation is off', async () => {
    vi.stubEnv('ADMIN_PATH', 'abc123');
    vi.stubEnv('ADMIN_PATH_ROTATE', 'off');
    const res = await at('/m/abc123');
    expect(rewritten(res)).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(await passes('/m/abc123/anything')).toBe(true);
  });
  it("opens only this week's and last week's segment by default, not the plain ADMIN_PATH", async () => {
    vi.stubEnv('ADMIN_PATH', 'abc123');
    const [current, previous] = validAdminSegments();
    expect(await passes(`/m/${current}`)).toBe(true);
    expect(await passes(`/m/${previous}/x`)).toBe(true);
    expect(rewritten(await at('/m/abc123'))).toContain('/__no_such_page__');
  });
  it('rewrites a wrong, empty or case-different segment to a page that does not exist', async () => {
    vi.stubEnv('ADMIN_PATH', 'abc123');
    vi.stubEnv('ADMIN_PATH_ROTATE', 'off');
    for (const p of ['/m/nope', '/m/', '/m', '/m/ABC123', '/m/abc1234', '/m/abc12']) {
      expect(rewritten(await at(p)), p).toContain('/__no_such_page__');
    }
  });
  it('rejects everything when ADMIN_PATH is not set', async () => {
    vi.stubEnv('ADMIN_PATH', '');
    expect(rewritten(await at('/m/anything'))).toContain('/__no_such_page__');
    expect(rewritten(await at('/m/'))).toContain('/__no_such_page__');
  });
});
