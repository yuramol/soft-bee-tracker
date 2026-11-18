'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

import { fetchInvoice } from './queries';
import { invoiceKeys } from './queries';
import type { CreateInvoiceInput, Invoice } from './types';

/**
 * Calls the `create_invoice` database function and returns the full saved invoice
 * (header + lines). Throws `ApiError` on failure, forwarding the database error
 * message so the caller sees meaningful text ("no approved time entries…", etc.).
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const supabase = createBrowserClient();

  const {
    data: invoiceId,
    error,
    status
  } = await supabase.rpc('create_invoice', {
    target_project_id: input.projectId,
    period_start: input.periodStart,
    period_end: input.periodEnd
  });

  if (error) {
    throw { message: error.message, statusCode: status } satisfies ApiError;
  }

  if (!invoiceId) {
    throw { message: 'Invoice creation returned no ID.', statusCode: 500 } satisfies ApiError;
  }

  return fetchInvoice(invoiceId);
}

export function useCreateInvoice(options?: { onSuccess?: (invoice: Invoice) => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.byProject(invoice.projectId) });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.details() });
      options?.onSuccess?.(invoice);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}
