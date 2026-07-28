'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ROUTES } from '@/constants';
import { authKeys, fetchSessionProfile } from '@/lib/api/auth/queries';
import { createBrowserClient } from '@/lib/supabase/client';
import type { RecoverPasswordRequest, SignInRequest, SignUpMetadata, SignUpRequest, UpdatePasswordRequest } from '@/lib/api/auth/types';
import type { ApiError } from '@/types/api-error';

interface UseAuthMutationOptions {
  onSuccess?: () => void;
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
      message: 'Your account has been blocked. Please contact an administrator.',
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

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status
    } satisfies ApiError;
  }
}

export function useSignOut(options?: UseAuthMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOutUser,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.all });
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
      toast.success('Account created! Please check your email to verify your profile.');
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
      toast.success('Reset link sent! Please check your mailbox.');
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
      toast.success('Password changed! You can now log in.');
      options?.onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}
