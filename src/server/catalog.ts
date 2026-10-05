import type { PublicBattery } from './public-dto';
import { toPublicBattery } from './public-dto';
import { getRepository } from './repository';

export type { PublicBattery };

export async function getPublicCatalog(): Promise<PublicBattery[]> {
  return (await getRepository().listActiveBatteries()).map(toPublicBattery);
}
