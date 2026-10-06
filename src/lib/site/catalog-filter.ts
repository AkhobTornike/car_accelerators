export type CatalogChip = 'all' | 'car' | 'truck' | 'moto' | 'deep' | 'SMF' | 'EFB' | 'AGM';

export interface FilterableBattery {
  segment: string;
  tech: string;
}

export function filterCatalog<T extends FilterableBattery>(items: T[], chip: CatalogChip): T[] {
  if (chip === 'all') return items;
  if (chip === 'SMF' || chip === 'EFB' || chip === 'AGM') return items.filter((b) => b.tech === chip);
  return items.filter((b) => b.segment === chip);
}
