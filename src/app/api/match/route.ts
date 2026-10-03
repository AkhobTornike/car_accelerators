import { z } from 'zod';
import { fitmentIdParam, handle } from '@/server/http';
import { toPublicMatch } from '@/server/public-dto';
import { getRepository } from '@/server/repository';

export const GET = (request: Request) =>
  handle(request, z.object({ fitmentId: fitmentIdParam }), async ({ fitmentId }) => ({
    results: (await getRepository().findBatteriesForFitment(fitmentId)).map(toPublicMatch),
  }));
