import { adminHandle, adminJson, readBody } from '@/server/admin-http';
import { newBatteryBody } from '@/server/admin-schemas';
import { getInventory, getRepository } from '@/server/repository';

// Admin only: the full records, including costPrice and inactive batteries (the public API never returns these).
export const GET = (request: Request) =>
  adminHandle(request, async () => adminJson({ batteries: await getRepository().listBatteries() }));

export const POST = (request: Request) =>
  adminHandle(request, async () => {
    const { battery, initialQuantity } = await readBody(request, newBatteryBody);
    return adminJson({ battery: await getInventory().createBattery(battery, initialQuantity, 'admin') }, 201);
  });
