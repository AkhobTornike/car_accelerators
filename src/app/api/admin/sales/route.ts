import { adminHandle, adminJson, readBody, readQuery } from '@/server/admin-http';
import { newSaleBody, rangeQuery } from '@/server/admin-schemas';
import { getInventory } from '@/server/repository';

export const GET = (request: Request) =>
  adminHandle(request, async () => adminJson(await getInventory().listSales(readQuery(request, rangeQuery))));

export const POST = (request: Request) =>
  adminHandle(request, async () => adminJson({ sale: await getInventory().recordSale(await readBody(request, newSaleBody)) }, 201));
