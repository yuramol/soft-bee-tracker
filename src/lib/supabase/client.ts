import { Database } from '@/types';
import { createBrowserClient as createBrowserClientLib } from '@supabase/ssr';

export function createBrowserClient() {
  return createBrowserClientLib<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
