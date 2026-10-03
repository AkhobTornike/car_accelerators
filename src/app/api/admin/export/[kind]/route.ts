import { movementsToCsv, salesToCsv, stockToCsv } from '@core/csv';
import { adminHandle, readQuery } from '@/server/admin-http';
import { exportKind, rangeQuery } from '@/server/admin-schemas';
import { InventoryError } from '@/server/inventory-errors';
import { getInventory, getRepository } from '@/server/repository';

export const GET = (request: Request, ctx: { params: Promise<{ kind: string }> }) =>
  adminHandle(request, async () => {
    const kind = exportKind.safeParse((await ctx.params).kind);
    if (!kind.success) throw new InventoryError('not_found');
    const range = readQuery(request, rangeQuery);
    const inv = getInventory();
    const csv =
      kind.data === 'sales' ? (({ sales, voids }) => salesToCsv(sales, voids))(await inv.listSales(range))
      : kind.data === 'movements' ? movementsToCsv(await inv.listMovements({ range }))
      : stockToCsv(await getRepository().listBatteries());
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="amper-${kind.data}-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  });
