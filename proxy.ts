import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildSecurityHeaders } from '@/lib/security-headers';

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
    return new NextResponse(
      [
        'Missing Supabase environment variables.',
        '',
        '1. Create or edit `.env.local` in the project root (same folder as `package.json`).',
        '2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from:',
        '   https://supabase.com/dashboard/project/_/settings/api',
        '3. Restart the dev server (`npm run dev`).',
        '',
        '(SUPABASE_SERVICE_ROLE_KEY is also required for admin/server routes.)',
      ].join('\n'),
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return new NextResponse('Authentication service unavailable. Please try again.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users to login.
  const isPublicRoute = pathname.startsWith('/share/');
  const isPublicCommentApi =
    pathname === '/api/comments' && request.method === 'POST';

  if (
    !user &&
    pathname !== '/login' &&
    !isPublicRoute &&
    !isPublicCommentApi
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Guard admin routes.
  if (pathname.startsWith('/admin')) {
    const role = user?.user_metadata?.role;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Attach security headers to every response.
  const securityHeaders = buildSecurityHeaders({
    isDev: process.env.NODE_ENV !== 'production',
  });
  for (const [key, value] of Object.entries(securityHeaders)) {
    supabaseResponse.headers.set(key, value);
  }

  return supabaseResponse;
}

export const config = {
  // Exclude: Next.js internals, login, /public/* paths, and common static file extensions
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot|map)).*)'],
};
