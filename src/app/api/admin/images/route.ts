import { adminHandle, adminJson } from '@/server/admin-http';
import { checkImage, getImageStore } from '@/server/image-store';
import { InventoryError } from '@/server/inventory-errors';
import { getInventory, getRepository } from '@/server/repository';

/** multipart: `batteryId` + `file`. Uploads, then appends the URL to the battery's images (max 6). */
export const POST = (request: Request) =>
  adminHandle(request, async () => {
    const form = await request.formData().catch(() => null);
    const batteryId = form?.get('batteryId');
    const file = form?.get('file');
    if (typeof batteryId !== 'string' || !(file instanceof File)) throw new InventoryError('invalid_input', ['batteryId and file are required']);
    checkImage(file.type, file.size);
    const inv = getInventory();
    const battery = await getRepository().getBattery(batteryId);
    if (!battery) throw new InventoryError('not_found', ['battery']);
    const images = battery.images ?? [];
    if (images.length >= 6) throw new InventoryError('invalid_input', ['images: at most 6 per product']);
    const url = await getImageStore().save(batteryId, await file.arrayBuffer(), file.type);
    await inv.updateBattery(batteryId, { images: [...images, url] }, 'admin');
    return adminJson({ url, images: [...images, url] }, 201);
  });

/** body: { batteryId, url } — removes the URL from the battery and deletes the file. */
export const DELETE = (request: Request) =>
  adminHandle(request, async () => {
    const b = (await request.json().catch(() => null)) as { batteryId?: unknown; url?: unknown } | null;
    if (typeof b?.batteryId !== 'string' || typeof b.url !== 'string') throw new InventoryError('invalid_input', ['batteryId and url are required']);
    const inv = getInventory();
    const battery = await getRepository().getBattery(b.batteryId);
    if (!battery) throw new InventoryError('not_found', ['battery']);
    const images = battery.images ?? [];
    if (!images.includes(b.url)) throw new InventoryError('not_found', ['image']);
    await inv.updateBattery(b.batteryId, { images: images.filter((u) => u !== b.url) }, 'admin');
    await getImageStore().remove(b.url);
    return adminJson({ images: images.filter((u) => u !== b.url) });
  });
