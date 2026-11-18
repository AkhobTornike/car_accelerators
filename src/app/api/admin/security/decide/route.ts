import { z } from 'zod';
import { adminHandle, adminJson, readBody } from '@/server/admin-http';
import { sendSecurityAlert } from '@/server/security-alert';
import { approveDevice, rejectDevice } from '@/server/security-state';
import { revokeAdminSessions } from '@/server/revoke-sessions';

const body = z.object({ ip: z.string().min(3).max(64), approve: z.boolean() });

// A trusted admin approves or rejects a waiting device (a device that is itself pending gets 403 from adminHandle).
// Rejecting replaces the link at once: the new one is emailed to the owners and every session is signed out.
export const POST = (request: Request) =>
  adminHandle(request, async () => {
    const { ip, approve } = await readBody(request, body);
    if (approve) return adminJson({ ok: await approveDevice(ip), rotated: false });
    const rotation = await rejectDevice(ip);
    if (rotation) {
      await sendSecurityAlert(rotation);
      await revokeAdminSessions();
    }
    return adminJson({ ok: rotation !== null, rotated: rotation !== null });
  });
