import { adminHandle, adminJson, readBody } from '@/server/admin-http';
import { adjustBody } from '@/server/admin-schemas';
import { getInventory } from '@/server/repository';

export const POST = (request: Request) =>
  adminHandle(request, async () => {
    const b = await readBody(request, adjustBody);
    return adminJson({ movement: await getInventory().adjustStock(b.batteryId, b.countedQuantity, b.note) }, 201);
  });
