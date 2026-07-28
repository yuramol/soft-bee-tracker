import { createServerClient } from '@/lib/supabase/server';
import { mapUserRowToProfile } from '@/lib/api/auth/mappers';
import type { UserProfile } from '@/lib/api/auth/types';

// server-component/route-handler counterpart of useSessionProfile.
// imported via '@/lib/api/auth/server' (not the barrel) so client bundles
// never pull in next/headers.
export async function getSessionProfile(): Promise<UserProfile | null> {
  const supabase = await createServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase.from('users').select('*').eq('id', userData.user.id).single();

  if (error) {
    return null;
  }

  return mapUserRowToProfile(data);
}
