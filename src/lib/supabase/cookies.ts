'use client';

const SUPABASE_COOKIE_PREFIX = 'sb-';

/**
 * Expires every `sb-*` cookie visible to the browser.
 *
 * `signOut()` already drops the auth cookie it wrote, but chunked (`...auth-token.0`)
 * or stale cookies left by an earlier session can outlive it and keep the proxy
 * seeing a user. Sweeping the prefix makes logout deterministic.
 */
export function clearSupabaseAuthCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim();

    if (!name?.startsWith(SUPABASE_COOKIE_PREFIX)) {
      return;
    }

    // matches the path @supabase/ssr writes with, otherwise the delete silently misses
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  });
}
