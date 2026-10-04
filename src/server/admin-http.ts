import { z } from 'zod';
import { requireAdmin } from './admin-auth';
import { InventoryError } from './inventory-errors';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY = 100_000;
const STATUS = { invalid_sale: 422, invalid_input: 400, not_found: 404, already_voided: 409, no_change: 409 } as const;

export const adminJson = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Parse a JSON body. Error details name the failing fields only — never echo submitted values (customer data). */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) throw new InventoryError('invalid_input', ['body too large']);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { throw new InventoryError('invalid_input', ['body is not valid JSON']); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new InventoryError('invalid_input', parsed.error.issues.map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`));
  return parsed.data;
}

export function readQuery<S extends z.ZodType>(request: Request, schema: S): z.output<S> {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new InventoryError('invalid_input', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  return parsed.data;
}

/** Auth check, then `run`; expected failures become 4xx JSON, anything else a generic 500. */
export async function adminHandle(request: Request, run: () => Promise<Response>): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return await run();
  } catch (e) {
    if (e instanceof InventoryError) return adminJson({ error: e.code, details: e.details }, STATUS[e.code]);
    console.error('admin api error', e instanceof Error ? e.message : 'unknown');
    return adminJson({ error: 'server_error' }, 500);
  }
}
