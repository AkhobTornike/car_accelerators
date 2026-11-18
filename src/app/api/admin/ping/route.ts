import { adminHandle, adminJson } from '@/server/admin-http';

// Cheap authenticated call the admin page makes every few seconds: when the link was rotated or the session revoked it
// answers 401 and the page signs itself out at once.
export const GET = (request: Request) => adminHandle(request, async () => adminJson({ ok: true }));
