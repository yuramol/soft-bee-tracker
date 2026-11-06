import 'server-only';

import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants';
import { createServerClient } from '@/lib/supabase/server';
import { mapUserRowToProfile, USER_COLUMNS } from '@/lib/api/auth/mappers';
import type { UserProfile } from '@/lib/api/auth/types';
import { canRoleAccessRoute } from '@/lib/route-access';

// server-component/route-handler counterpart of useSessionProfile.
// imported via '@/lib/api/auth/server' (not the barrel) so client bundles
// never pull in next/headers.
export async function getSessionProfile(): Promise<UserProfile | null> {
  const supabase = await createServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase.from('users').select(USER_COLUMNS).eq('id', userData.user.id).single();

  if (error) {
    return null;
  }

  return mapUserRowToProfile(data);
}

// defense in depth for role-restricted pages: the proxy already blocks these
// routes, but the page re-checks so it stays protected if the proxy matcher
// or route table drifts. reads the role from public.users through RLS.
export async function requireRouteAccess(pathname: string): Promise<UserProfile> {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  if (!canRoleAccessRoute(pathname, profile.role)) {
    redirect(ROUTES.ACCESS_DENIED);
  }

  return profile;
}
