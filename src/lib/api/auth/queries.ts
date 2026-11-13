'use client';

import { useQuery } from '@tanstack/react-query';

import { createBrowserClient } from '@/lib/supabase/client';
import { mapUserRowToProfile, USER_COLUMNS } from '@/lib/api/auth/mappers';
import type { UserProfile } from '@/lib/api/auth/types';
import type { ApiError } from '@/types/api-error';

export const authKeys = {
  all: ['auth'] as const,
  sessionProfile: () => [...authKeys.all, 'session-profile'] as const,
  pendingEmail: () => [...authKeys.all, 'pending-email'] as const
};

export async function fetchSessionProfile(): Promise<UserProfile | null> {
  const supabase = createBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase.from('users').select(USER_COLUMNS).eq('id', userData.user.id).single();

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

// the address waiting for confirmation lives on the auth user, not on public.users
export async function getPendingEmailChange(): Promise<string | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status ?? 401
    } satisfies ApiError;
  }

  return data.user?.new_email ?? null;
}

export function usePendingEmailChange() {
  return useQuery<string | null, ApiError>({
    queryKey: authKeys.pendingEmail(),
    queryFn: getPendingEmailChange
  });
}
