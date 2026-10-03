import { z } from 'zod';

const text = (max: number, min = 1) => z.string().trim().min(min).max(max).regex(/^[^\u0000-\u001f\u007f]+$/);

export const vehicleType = z.enum(['car', 'van', 'truck', 'moto']);
export const makeParam = text(60);
export const modelParam = text(60);
export const yearParam = z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().int().min(1950).max(2100));
export const fitmentIdParam = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const codeParam = text(40, 3);

const CACHE = 'public, max-age=300';

export const ok = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': CACHE } });
export const badRequest = () => Response.json({ error: 'invalid_request' }, { status: 400 });

/** Parse the query string with `schema` (unknown params ignored), run `fn`, map failures to safe responses. */
export async function handle<S extends z.ZodType>(request: Request, schema: S, fn: (q: z.output<S>) => Promise<unknown>) {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return badRequest();
  try {
    return ok(await fn(parsed.data));
  } catch (e) {
    console.error('api error', e);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
