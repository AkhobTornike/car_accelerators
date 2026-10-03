import { adminHandle, adminJson, readBody } from '@/server/admin-http';
import { voidBody } from '@/server/admin-schemas';
import { getInventory } from '@/server/repository';

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  adminHandle(request, async () => {
    const { id } = await ctx.params;
    const { reason } = await readBody(request, voidBody);
    return adminJson({ void: await getInventory().voidSale(id, reason) }, 201);
  });
