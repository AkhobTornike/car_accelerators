import { z } from 'zod';
import { handle, makeParam, vehicleType } from '@/server/http';
import { getRepository } from '@/server/repository';

export const GET = (request: Request) =>
  handle(request, z.object({ type: vehicleType, make: makeParam }), async ({ type, make }) => ({
    models: await getRepository().getModels(type, make),
  }));
