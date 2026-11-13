import 'server-only';

import { createServerClient } from '@/lib/supabase/server';
import type { ApiError } from '@/types/api-error';

// server check for the member profile route: rls returns the row only when the
// signed-in user may see that person, so false means "not found" for this viewer
export async function canViewCrewMember(memberId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data, error, status } = await supabase.from('users').select('id').eq('id', memberId).maybeSingle();

  if (error) {
    // an id that isn't a uuid can never match a profile
    if (error.code === '22P02') {
      return false;
    }

    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return data !== null;
}
