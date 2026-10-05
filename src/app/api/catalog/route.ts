import { z } from 'zod';
import { getPublicCatalog } from '@/server/catalog';
import { handle } from '@/server/http';

const filters = z.object({
  segment: z.enum(['car', 'truck', 'moto', 'deep']).optional(),
  tech: z.enum(['SMF', 'EFB', 'AGM', 'DEEP-CYCLE']).optional(),
});

export const GET = (request: Request) =>
  handle(request, filters, async ({ segment, tech }) => {
    let batteries = await getPublicCatalog();
    if (segment) batteries = batteries.filter((b) => b.segment === segment);
    if (tech) batteries = batteries.filter((b) => b.tech === tech);
    return { batteries };
  });
