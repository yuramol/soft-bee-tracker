import Big from 'big.js';

import type { InvoiceLine, InvoiceSummary, Invoice, InvoiceLineRow, InvoiceRow } from './types';

/**
 * Round-trip a Postgres numeric value through Big to avoid any IEEE 754 drift
 * that may occur when PostgREST serialises numeric → JSON number → JS number.
 */
function toNumber(value: number | null): number {
  return value === null ? 0 : new Big(value).toNumber();
}

export const INVOICE_COLUMNS =
  'id, number, issue_date, project_id, project_name, client_name, period_start, period_end, issuer_id, issuer_name, issuer_email, currency, total, created_at';

export const INVOICE_LINE_COLUMNS = 'id, invoice_id, user_id, developer_name, minutes, hours, billing_rate, amount';

/** Columns used when fetching a full invoice with its lines embedded. */
export const INVOICE_WITH_LINES_COLUMNS = `${INVOICE_COLUMNS}, invoice_lines(${INVOICE_LINE_COLUMNS})`;

export function mapInvoiceLineRow(row: InvoiceLineRow): InvoiceLine {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    userId: row.user_id,
    developerName: row.developer_name,
    minutes: row.minutes,
    hours: toNumber(row.hours),
    billingRate: toNumber(row.billing_rate),
    amount: toNumber(row.amount)
  };
}

export function mapInvoiceRow(row: InvoiceRow): InvoiceSummary {
  return {
    id: row.id,
    number: row.number,
    issueDate: row.issue_date,
    projectId: row.project_id,
    projectName: row.project_name,
    clientName: row.client_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    issuerId: row.issuer_id,
    issuerName: row.issuer_name,
    issuerEmail: row.issuer_email,
    currency: row.currency,
    total: toNumber(row.total),
    createdAt: row.created_at
  };
}

/**
 * Folds a header row together with its embedded line rows into a full Invoice.
 * This conversion (many rows → one nested object) is why a mapper file exists.
 */
export function mapInvoiceWithLines(row: InvoiceRow & { invoice_lines: InvoiceLineRow[] }): Invoice {
  return {
    ...mapInvoiceRow(row),
    lines: row.invoice_lines.map(mapInvoiceLineRow)
  };
}
