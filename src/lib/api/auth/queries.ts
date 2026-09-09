'use client';

import { useQuery } from '@tanstack/react-query';

import { createBrowserClient } from '@/lib/supabase/client';
import { mapUserRowToProfile } from '@/lib/api/auth/mappers';
import type { UserProfile } from '@/lib/api/auth/types';
import type { ApiError } from '@/types/api-error';

export const authKeys = {
  all: ['auth'] as const,
  sessionProfile: () => [...authKeys.all, 'session-profile'] as const
};

export async function fetchSessionProfile(): Promise<UserProfile | null> {
  const supabase = createBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase.from('users').select('*').eq('id', userData.user.id).single();

  if (error) {
    throw {
      message: error.message,
      statusCode: 500
    } satisfies ApiError;
  }

  return mapUserRowToProfile(data);
}

export function useSessionProfile() {
  return useQuery({
    queryKey: authKeys.sessionProfile(),
    queryFn: fetchSessionProfile
  });
}
