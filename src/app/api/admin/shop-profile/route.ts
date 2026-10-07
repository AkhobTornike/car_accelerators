import { adminHandle, adminJson } from '@/server/admin-http';
import { getShopProfile } from '@/server/shop-profile';

// Admin only: receipt details (tax id, IBAN) are not public. `demo: true` means the real profile is not configured yet.
export const GET = (request: Request) => adminHandle(request, async () => adminJson(getShopProfile()));
