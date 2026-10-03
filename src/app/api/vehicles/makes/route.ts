import { z } from 'zod';
import { handle, vehicleType } from '@/server/http';
import { getRepository } from '@/server/repository';

export const GET = (request: Request) =>
  handle(request, z.object({ type: vehicleType }), async ({ type }) => ({ makes: await getRepository().getMakes(type) }));
