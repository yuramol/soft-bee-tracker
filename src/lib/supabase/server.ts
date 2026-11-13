import 'server-only';

import type { CookieOptions } from '@supabase/ssr';
import { createServerClient as createServerClientLib } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { assertServerExecutionContext } from '@/lib/supabase/env-safeguards';
import { Database } from '@/types';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createServerClientLib<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            return cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have proxy refreshing user sessions.
        }
      }
    }
  });
}

/** Server-only admin client for backend APIs — no cookie/session handling. */
export function createServiceClient() {
  assertServerExecutionContext('createServiceClient');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error('SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL are required on the server to create a service client.');
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
