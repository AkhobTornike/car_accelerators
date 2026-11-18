import { adminJson } from '@/server/admin-http';
import { authorizeAdmin } from '@/server/admin-auth';
import { listPendingDevices } from '@/server/security-state';

// Called by the admin page every few seconds. Answers 401 when the link/session is no longer valid (the page then signs
// out). A device that is not trusted yet gets `device: "pending"`; a trusted one also sees the devices waiting for approval.
export async function GET(request: Request) {
  const a = await authorizeAdmin(request, Date.now(), { allowPending: true });
  if (a.denied) return a.denied;
  return adminJson({ device: a.device, pending: a.device === 'trusted' ? await listPendingDevices() : [] });
}
