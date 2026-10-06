import { put, del } from '@vercel/blob';
import { InventoryError } from './inventory-errors';

export const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export const MAX_IMAGE_BYTES = 1_000_000; // the browser resizes to <=1200px WebP first; this is the hard cap

/** Where product pictures live. Only URLs are stored on the Battery, never the bytes. */
export interface ImageStore {
  save(batteryId: string, bytes: ArrayBuffer, contentType: string): Promise<string>;
  remove(url: string): Promise<void>;
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export const vercelBlobStore: ImageStore = {
  async save(batteryId, bytes, contentType) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    const blob = await put(`products/${batteryId}.${EXT[contentType]}`, bytes, {
      access: 'public', contentType, addRandomSuffix: true, cacheControlMaxAge: 31_536_000,
    });
    return blob.url;
  },
  async remove(url) {
    if (process.env.BLOB_READ_WRITE_TOKEN) await del(url);
  },
};

let store: ImageStore = vercelBlobStore;
export const getImageStore = () => store;
export const setImageStoreForTests = (s: ImageStore | null) => { store = s ?? vercelBlobStore; };

export function checkImage(contentType: string, size: number): void {
  if (!(IMAGE_TYPES as readonly string[]).includes(contentType)) throw new InventoryError('invalid_input', ['image: type must be webp, jpeg or png']);
  if (size === 0 || size > MAX_IMAGE_BYTES) throw new InventoryError('invalid_input', ['image: size must be 1 byte to 1 MB']);
}
