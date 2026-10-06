import { NextResponse, type NextRequest } from 'next/server';

// The admin screens live at /m/<ADMIN_PATH>/. For any other segment (or when ADMIN_PATH is not set at all) the request is
// rewritten to a URL that matches nothing, so the visitor gets exactly the same 404 as for any unknown address —
// not a different error shell that would reveal that "/m/" is a real prefix.
export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split('/')[2] ?? '';
  const secret = process.env.ADMIN_PATH;
  if (!secret || segment !== secret) {
    return NextResponse.rewrite(new URL('/__no_such_page__', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: '/m/:path*' };
