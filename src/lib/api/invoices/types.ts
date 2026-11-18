import type { Database } from '@/types';

type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
type InvoiceLineRow = Database['public']['Tables']['invoice_lines']['Row'];

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  userId: string | null;
  developerName: string;
  minutes: number;
  hours: number;
  billingRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  projectId: string;
  projectName: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  issuerId: string | null;
  issuerName: string;
  issuerEmail: string;
  currency: string;
  total: number;
  createdAt: string;
  lines: InvoiceLine[];
}

/** Lightweight summary for list views — no lines. */
export type InvoiceSummary = Omit<Invoice, 'lines'>;

export interface CreateInvoiceInput {
  projectId: string;
  periodStart: string;
  periodEnd: string;
}

// Keep the generated row types available for mappers and tests.
export type { InvoiceRow, InvoiceLineRow };
