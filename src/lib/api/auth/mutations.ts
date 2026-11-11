'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ROUTES } from '@/constants';
import { authKeys, fetchSessionProfile } from '@/lib/api/auth/queries';
import { mapAvatarUpdateToUserRow, mapProfileUpdateToUserRow, mapUserRowToProfile, USER_COLUMNS } from '@/lib/api/auth/mappers';
import { AVATAR_BUCKET, buildAvatarPath, validateAvatarFile } from '@/lib/avatar';
import { createBrowserClient } from '@/lib/supabase/client';
import { clearSupabaseAuthCookies } from '@/lib/supabase/cookies';
import { resetClientState } from '@/lib/api/reset-client-state';
import type {
  RecoverPasswordRequest,
  RequestEmailChangeRequest,
  SignInRequest,
  SignUpMetadata,
  SignUpRequest,
  UpdatePasswordRequest,
  UpdateProfileRequest,
  UserProfile
} from '@/lib/api/auth/types';
import type { Database } from '@/types';
import type { ApiError } from '@/types/api-error';
import content from './content.json';

interface UseAuthMutationOptions {
  onSuccess?: () => void;
  successMessage?: string;
}

export async function signInWithPassword(params: SignInRequest): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password
  });

  if (error) {
    throw {
      message: error.message,
      statusCode: 401
    } satisfies ApiError;
  }

  // blocked users authenticate at the supabase auth layer but must not enter the app
  const profile = await fetchSessionProfile();

  if (profile?.isBlocked) {
    await supabase.auth.signOut();
    throw {
      message: content.blocked,
      statusCode: 403
    } satisfies ApiError;
  }
}

export function useSignIn(options?: UseAuthMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signInWithPassword,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.all });
      options?.onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}

export async function signOutUser(): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.signOut();

  // a session that is already gone is the outcome we wanted, not a failure to report
  if (error && error.name !== 'AuthSessionMissingError') {
    throw {
      message: error.message,
      statusCode: error.status
    } satisfies ApiError;
  }

  clearSupabaseAuthCookies();
}

export function useSignOut(options?: UseAuthMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOutUser,
    onSuccess: () => {
      resetClientState(queryClient);
      options?.onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}

export async function signUpWithProfile(params: SignUpRequest): Promise<void> {
  const supabase = createBrowserClient();

  // metadata keys mirror public.users columns so the handle_new_user trigger maps them 1:1;
  // role/is_confirmed/is_blocked are server-enforced by the trigger regardless of these values
  const metadata: SignUpMetadata = {
    role: 'worker',
    username: params.username,
    first_name: params.firstName,
    last_name: params.lastName,
    phone: params.phone || null,
    linkedin: params.linkedin || null,
    upwork: params.upwork || null,
    is_confirmed: false,
    is_blocked: false
  };

  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: metadata
    }
  });

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status
    } satisfies ApiError;
  }
}

export function useSignUp(options?: UseAuthMutationOptions) {
  return useMutation({
    mutationFn: signUpWithProfile,
    onSuccess: () => {
      toast.success(content.signUpSuccess);
      options?.onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}

export async function recoverPassword(params: RecoverPasswordRequest): Promise<void> {
  const supabase = createBrowserClient();

  // the customized recovery email template links straight to /auth/confirm with a
  // token_hash; redirectTo is the fallback target when the default template is active
  const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
    redirectTo: `${window.location.origin}/auth/confirm?next=${ROUTES.UPDATE_PASSWORD}`
  });

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status
    } satisfies ApiError;
  }
}

export function useRecoverPassword(options?: UseAuthMutationOptions) {
  return useMutation({
    mutationFn: recoverPassword,
    onSuccess: () => {
      toast.success(content.resetLinkSent);
      options?.onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}

export async function updatePassword(params: UpdatePasswordRequest): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.updateUser({
    password: params.password
  });

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status
    } satisfies ApiError;
  }
}

export function useUpdatePassword(options?: UseAuthMutationOptions) {
  return useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success(options?.successMessage ?? content.passwordChanged);
      options?.onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}

export async function updateProfile(params: UpdateProfileRequest): Promise<UserProfile> {
  const userId = await getSessionUserId(createBrowserClient());

  return updateSessionUserRow(userId, mapProfileUpdateToUserRow(params));
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, ApiError, UpdateProfileRequest>({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(authKeys.sessionProfile(), profile);
    }
  });
}

// the file goes to storage first so the row only ever points at an object that exists
export async function uploadAvatar(file: File): Promise<UserProfile> {
  const validationError = validateAvatarFile(file);

  if (validationError) {
    throw {
      message: validationError,
      statusCode: 400
    } satisfies ApiError;
  }

  const supabase = createBrowserClient();
  const userId = await getSessionUserId(supabase);
  const path = buildAvatarPath(userId, file, Date.now());
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, cacheControl: '3600' });

  if (uploadError) {
    throw {
      message: uploadError.message,
      statusCode: 500
    } satisfies ApiError;
  }

  try {
    const profile = await updateSessionUserRow(userId, mapAvatarUpdateToUserRow({ avatarUrl: bucket.getPublicUrl(path).data.publicUrl }));
    await removeStoredAvatars(supabase, userId, path);

    return profile;
  } catch (error) {
    await removeStoredAvatars(supabase, userId, null, [path]);
    throw error;
  }
}

export async function removeAvatar(): Promise<UserProfile> {
  const supabase = createBrowserClient();
  const userId = await getSessionUserId(supabase);
  const profile = await updateSessionUserRow(userId, mapAvatarUpdateToUserRow({ avatarUrl: null }));

  await removeStoredAvatars(supabase, userId, null);

  return profile;
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, ApiError, File>({
    mutationFn: uploadAvatar,
    onSuccess: (profile) => {
      queryClient.setQueryData(authKeys.sessionProfile(), profile);
    }
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, ApiError, void>({
    mutationFn: removeAvatar,
    onSuccess: (profile) => {
      queryClient.setQueryData(authKeys.sessionProfile(), profile);
    }
  });
}

// supabase keeps the old address until the link sent to the new one is opened
export async function requestEmailChange(params: RequestEmailChangeRequest): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.updateUser(
    { email: params.email },
    { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${ROUTES.PROFILE}` }
  );

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status
    } satisfies ApiError;
  }
}

export function useRequestEmailChange() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, RequestEmailChangeRequest>({
    mutationFn: requestEmailChange,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.pendingEmail() });
    }
  });
}

async function getSessionUserId(supabase: BrowserClient): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw {
      message: content.sessionExpired,
      statusCode: 401
    } satisfies ApiError;
  }

  return data.user.id;
}

async function updateSessionUserRow(userId: string, update: UserUpdate): Promise<UserProfile> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('users').update(update).eq('id', userId).select(USER_COLUMNS).single();

  if (error) {
    throw {
      // 23505 is the unique violation on users.username; the raw text leaks the constraint name
      message: error.code === '23505' ? content.usernameTaken : error.message,
      statusCode: error.code === '23505' ? 409 : 500
    } satisfies ApiError;
  }

  return mapUserRowToProfile(data);
}

// cleanup is best effort: a leftover file must never fail a save that already landed
async function removeStoredAvatars(supabase: BrowserClient, userId: string, keepPath: string | null, paths?: string[]) {
  try {
    const stalePaths =
      paths ?? ((await supabase.storage.from(AVATAR_BUCKET).list(userId)).data ?? []).map((object) => `${userId}/${object.name}`);
    const pathsToRemove = stalePaths.filter((path) => path !== keepPath);

    if (pathsToRemove.length > 0) {
      await supabase.storage.from(AVATAR_BUCKET).remove(pathsToRemove);
    }
  } catch {
    // orphaned files only cost storage; the profile row is already correct
  }
}

type UserUpdate = Database['public']['Tables']['users']['Update'];

type BrowserClient = ReturnType<typeof createBrowserClient>;
