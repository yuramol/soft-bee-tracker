import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { rpcMock, fromMock, selectMock, eqMock, singleMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    rpc: rpcMock,
    from: fromMock
  })
}));

import { createInvoice } from './mutations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj-1';
const INVOICE_ID = 'inv-uuid-1';

const fakeInvoiceRow = {
  id: INVOICE_ID,
  number: 'INV-2026-0001',
  issue_date: '2026-11-18',
  project_id: PROJECT_ID,
  project_name: 'Atlas',
  client_name: 'Acme',
  period_start: '2026-11-01',
  period_end: '2026-11-30',
  issuer_id: 'user-1',
  issuer_name: 'Mila Manager',
  issuer_email: 'mila@softbee.dev',
  currency: 'USD',
  total: 150.0,
  created_at: '2026-11-18T14:00:00Z',
  invoice_lines: [
    {
      id: 'line-1',
      invoice_id: INVOICE_ID,
      user_id: 'user-2',
      developer_name: 'Alex Dev',
      minutes: 90,
      hours: '1.5000',
      billing_rate: '100.00',
      amount: '150.00'
    }
  ]
};

function setupMocks(overrides: { rpcResult?: object; fromResult?: object } = {}) {
  rpcMock.mockResolvedValue(overrides.rpcResult ?? { data: INVOICE_ID, error: null, status: 200 });

  singleMock.mockResolvedValue(overrides.fromResult ?? { data: fakeInvoiceRow, error: null, status: 200 });
  eqMock.mockReturnValue({ single: singleMock });
  selectMock.mockReturnValue({ eq: eqMock });
  fromMock.mockReturnValue({ select: selectMock });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls rpc with the correct arguments', async () => {
    setupMocks();

    await createInvoice({ projectId: PROJECT_ID, periodStart: '2026-11-01', periodEnd: '2026-11-30' });

    expect(rpcMock).toHaveBeenCalledWith('create_invoice', {
      target_project_id: PROJECT_ID,
      period_start: '2026-11-01',
      period_end: '2026-11-30'
    });
  });

  it('fetches and returns the full invoice after creation', async () => {
    setupMocks();

    const invoice = await createInvoice({ projectId: PROJECT_ID, periodStart: '2026-11-01', periodEnd: '2026-11-30' });

    expect(invoice.id).toBe(INVOICE_ID);
    expect(invoice.number).toBe('INV-2026-0001');
    expect(invoice.total).toBe(150);
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0].amount).toBe(150);
    expect(invoice.lines[0].hours).toBe(1.5);
  });

  it('throws ApiError when rpc returns a database error', async () => {
    setupMocks({
      rpcResult: {
        data: null,
        error: { message: 'no approved time entries to invoice for this period' },
        status: 400
      }
    });

    await expect(createInvoice({ projectId: PROJECT_ID, periodStart: '2026-11-01', periodEnd: '2026-11-30' })).rejects.toMatchObject({
      message: 'no approved time entries to invoice for this period',
      statusCode: 400
    });
  });

  it('throws ApiError when rpc returns a missing-rate error', async () => {
    setupMocks({
      rpcResult: {
        data: null,
        error: { message: 'a client billing rate is missing for: Alex Dev' },
        status: 400
      }
    });

    await expect(createInvoice({ projectId: PROJECT_ID, periodStart: '2026-11-01', periodEnd: '2026-11-30' })).rejects.toMatchObject({
      message: 'a client billing rate is missing for: Alex Dev'
    });
  });

  it('throws ApiError when rpc returns a permission error', async () => {
    setupMocks({
      rpcResult: {
        data: null,
        error: { message: "permission denied: only admins and the project's responsible manager may create invoices" },
        status: 403
      }
    });

    await expect(createInvoice({ projectId: PROJECT_ID, periodStart: '2026-11-01', periodEnd: '2026-11-30' })).rejects.toMatchObject({
      message: expect.stringContaining('permission denied')
    });
  });

  it('throws ApiError when rpc returns null invoice id', async () => {
    setupMocks({ rpcResult: { data: null, error: null, status: 200 } });

    await expect(createInvoice({ projectId: PROJECT_ID, periodStart: '2026-11-01', periodEnd: '2026-11-30' })).rejects.toMatchObject({
      message: 'Invoice creation returned no ID.',
      statusCode: 500
    });
  });
});
