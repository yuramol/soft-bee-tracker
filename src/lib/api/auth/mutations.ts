'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createBrowserClient } from '@/lib/supabase/client';
import type { SignInRequest, SignUpMetadata, SignUpRequest } from '@/lib/api/auth/types';
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
}

export function useSignIn(options?: UseAuthMutationOptions) {
  return useMutation({
    mutationFn: signInWithPassword,
    onSuccess: () => {
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
