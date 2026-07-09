'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createBrowserClient } from '@/lib/supabase/client';
import type { SignInRequest } from '@/lib/api/auth/types';
import type { ApiError } from '@/types/api-error';

interface UseSignInOptions {
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

export function useSignIn(options?: UseSignInOptions) {
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
