import { adminHandle, adminJson } from '@/server/admin-http';
import { getRepository } from '@/server/repository';

// Admin only: the full records, including costPrice and inactive batteries (the public API never returns these).
export const GET = (request: Request) =>
  adminHandle(request, async () => adminJson({ batteries: await getRepository().listBatteries() }));
