import { NextResponse, type NextRequest } from 'next/server';

// The admin screens live at /m/<ADMIN_PATH>/. For any other segment (or when ADMIN_PATH is not set at all) the request is
// rewritten to a URL that matches nothing, so the visitor gets exactly the same 404 as for any unknown address —
// not a different error shell that would reveal that "/m/" is a real prefix.
//
// Language handling: Georgian is served at `/` (rewritten to `/ka`, URL unchanged); `/ka` redirects permanently
// to `/`; `/en` is served as is. Nothing else is touched — in particular no locale logic runs for /m/* or /api/*.
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/m' || pathname.startsWith('/m/')) {
    const segment = pathname.split('/')[2] ?? '';
    const secret = process.env.ADMIN_PATH;
    if (!secret || segment !== secret) {
      return NextResponse.rewrite(new URL('/__no_such_page__', request.url));
    }
    return NextResponse.next();
  }
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/ka', request.url));
  }
  if (pathname === '/ka' || pathname.startsWith('/ka/')) {
    return NextResponse.redirect(new URL('/', request.url), 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/', '/ka/:path*', '/m/:path*'] };
