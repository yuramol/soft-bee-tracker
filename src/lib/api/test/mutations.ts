'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { patchTestItem, testKeys } from '@/lib/api/test/queries';
import type { TestItem, UpdateTestItemRequest } from '@/lib/api/test/types';
import type { ApiError } from '@/types/api-error';

interface UseUpdateTestItemOptions {
  onSuccess?: (data: TestItem) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function updateTestItem(params: UpdateTestItemRequest): Promise<TestItem> {
  await delay(250);

  const updatedItem = patchTestItem(params.id, params.completed);

  if (!updatedItem) {
    throw {
      message: `Test item "${params.id}" was not found.`,
      statusCode: 404
    } satisfies ApiError;
  }

  return updatedItem;
}

export function useUpdateTestItem(options?: UseUpdateTestItemOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateTestItemRequest) => updateTestItem(params),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: testKeys.list() });
      void queryClient.invalidateQueries({ queryKey: testKeys.detail(data.id) });
      options?.onSuccess?.(data);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}
