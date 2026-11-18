import { afterEach, describe, expect, it } from 'vitest';
import { GET } from './route';

const call = (auth?: string) => GET(new Request('https://x.test/api/cron/weekly-summary', { headers: auth ? { authorization: auth } : {} }));

describe('cron weekly summary route', () => {
  afterEach(() => { delete process.env.CRON_SECRET; });
  it('fails closed without CRON_SECRET', async () => {
    expect((await call('Bearer anything')).status).toBe(401);
  });
  it('rejects a wrong or missing bearer token', async () => {
    process.env.CRON_SECRET = 'correct-horse-battery';
    expect((await call()).status).toBe(401);
    expect((await call('Bearer nope')).status).toBe(401);
  });
});
