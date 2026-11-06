import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { ROUTES } from '@/constants';
import { getRouteAccess, parseUserRole, type RouteSession } from '@/lib/route-access';
import { Database } from '@/types';

function applyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  });

  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      }
    }
  });

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // getClaims verifies the JWT (and refreshes it through setAll above), so the
  // role read here is the same claims.user_role that RLS checks.
  const { data, error } = await supabase.auth.getClaims();
  const session = error || !data ? null : getRouteSession(data.claims.user_role);

  const access = getRouteAccess(request.nextUrl.pathname, session);

  if (access === 'login') {
    return withSessionCookies(supabaseResponse, NextResponse.redirect(buildUrl(request, ROUTES.LOGIN)));
  }

  if (access === 'guest-only') {
    return withSessionCookies(supabaseResponse, NextResponse.redirect(buildUrl(request, ROUTES.DASHBOARD)));
  }

  if (access === 'denied') {
    // rewrite keeps the requested URL in the address bar and answers 403
    return withSessionCookies(supabaseResponse, NextResponse.rewrite(buildUrl(request, ROUTES.ACCESS_DENIED), { status: 403 }));
  }

  return supabaseResponse;
}

function getRouteSession(roleClaim: string | null | undefined): RouteSession {
  return { role: parseUserRole(typeof roleClaim === 'string' ? roleClaim : null) };
}

function buildUrl(request: NextRequest, pathname: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return url;
}

function withSessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  applyResponseCookies(source, target);
  return target;
}
