import { adminHandle, adminJson, readBody } from '@/server/admin-http';
import { receiveBody } from '@/server/admin-schemas';
import { getInventory } from '@/server/repository';

export const POST = (request: Request) =>
  adminHandle(request, async () => {
    const b = await readBody(request, receiveBody);
    return adminJson({ movement: await getInventory().receiveStock(b.batteryId, b.qty, { unitCost: b.unitCost, note: b.note }) }, 201);
  });
