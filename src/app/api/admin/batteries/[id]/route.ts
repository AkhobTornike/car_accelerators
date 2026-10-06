import { adminHandle, adminJson, readBody } from '@/server/admin-http';
import { patchBatteryBody } from '@/server/admin-schemas';
import { InventoryError } from '@/server/inventory-errors';
import { getInventory } from '@/server/repository';

const idOf = async (ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)) throw new InventoryError('not_found');
  return id;
};

export const PATCH = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  adminHandle(request, async () => {
    const id = await idOf(ctx);
    return adminJson({ battery: await getInventory().updateBattery(id, await readBody(request, patchBatteryBody), 'admin') });
  });

// 409 has_history when the product has stock movements or sales: hide it (PATCH active:false) instead.
export const DELETE = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  adminHandle(request, async () => adminJson(await getInventory().removeBattery(await idOf(ctx), 'admin')));
