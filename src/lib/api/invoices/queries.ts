'use client';

import { useQuery } from '@tanstack/react-query';

import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

import { INVOICE_WITH_LINES_COLUMNS, INVOICE_COLUMNS, mapInvoiceRow, mapInvoiceWithLines } from './mappers';
import type { Invoice, InvoiceSummary } from './types';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  byProject: (projectId: string) => [...invoiceKeys.lists(), projectId] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (invoiceId: string) => [...invoiceKeys.details(), invoiceId] as const
};

export async function fetchProjectInvoices(projectId: string): Promise<InvoiceSummary[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('invoices')
    .select(INVOICE_COLUMNS)
    .eq('project_id', projectId)
    .order('issue_date', { ascending: false });

  if (error) {
    throw { message: error.message, statusCode: status } satisfies ApiError;
  }

  return (data ?? []).map(mapInvoiceRow);
}

export async function fetchInvoice(invoiceId: string): Promise<Invoice> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('invoices').select(INVOICE_WITH_LINES_COLUMNS).eq('id', invoiceId).single();

  if (error) {
    throw { message: error.message, statusCode: status } satisfies ApiError;
  }

  return mapInvoiceWithLines(data);
}

export function useProjectInvoices(projectId: string) {
  return useQuery({
    queryKey: invoiceKeys.byProject(projectId),
    queryFn: () => fetchProjectInvoices(projectId),
    enabled: Boolean(projectId)
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: () => fetchInvoice(invoiceId),
    enabled: Boolean(invoiceId)
  });
}
