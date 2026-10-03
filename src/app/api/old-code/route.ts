import { z } from 'zod';
import { codeParam, handle } from '@/server/http';
import { toPublicBattery } from '@/server/public-dto';
import { getRepository } from '@/server/repository';

export const GET = (request: Request) =>
  handle(request, z.object({ code: codeParam }), async ({ code }) => ({
    results: (await getRepository().findByOldCode(code)).map(toPublicBattery),
  }));
