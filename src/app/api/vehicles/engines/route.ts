import { z } from 'zod';
import { handle, makeParam, modelParam, vehicleType, yearParam } from '@/server/http';
import { getRepository } from '@/server/repository';

export const GET = (request: Request) =>
  handle(request, z.object({ type: vehicleType, make: makeParam, model: modelParam, year: yearParam.optional() }), async (q) => ({
    engines: await getRepository().getEngines(q.type, q.make, q.model, q.year),
  }));
