import { beforeEach, describe, expect, it, vi } from 'vitest';

import content from './content.json';
import { mapLeaveErrorToApiError } from './mappers';
import { cancelLeaveRequest, createLeaveRequest } from './mutations';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

const leaveRow = {
  id: 'leave-1',
  leave_type: 'vacation' as const,
  start_date: '2030-03-04',
  end_date: '2030-03-08',
  note: 'Spring break',
  status: 'pending' as const
};

interface QueryResult {
  data: typeof leaveRow | null;
  error: { code: string; message: string } | null;
  status: number;
}

function mockLeaveTable(result: QueryResult) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const insert = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ insert, update }));

  createBrowserClient.mockReturnValue({ from });

  return { from, insert, update, eq };
}

describe('createLeaveRequest', () => {
  beforeEach(() => {
    createBrowserClient.mockReset();
  });

  it('sends the request as snake_case and returns it mapped', async () => {
    const { from, insert } = mockLeaveTable({ data: leaveRow, error: null, status: 201 });

    const request = await createLeaveRequest({
      leaveType: 'vacation',
      startDate: '2030-03-04',
      endDate: '2030-03-08',
      note: 'Spring break'
    });

    expect(from).toHaveBeenCalledWith('leave_requests');
    expect(insert).toHaveBeenCalledWith({ leave_type: 'vacation', start_date: '2030-03-04', end_date: '2030-03-08', note: 'Spring break' });
    expect(request).toEqual({
      id: 'leave-1',
      leaveType: 'vacation',
      startDate: '2030-03-04',
      endDate: '2030-03-08',
      note: 'Spring break',
      status: 'pending'
    });
  });

  it('explains an overlap instead of showing the database message', async () => {
    mockLeaveTable({
      data: null,
      error: { code: '23P01', message: 'conflicting key value violates exclusion constraint "leave_requests_no_overlap"' },
      status: 409
    });

    await expect(createLeaveRequest({ leaveType: 'vacation', startDate: '2030-03-04', endDate: '2030-03-05', note: null })).rejects.toEqual(
      { message: content.errors.overlap, statusCode: 409 }
    );
  });
});

describe('cancelLeaveRequest', () => {
  beforeEach(() => {
    createBrowserClient.mockReset();
  });

  it('only changes the status of the given request', async () => {
    const { update, eq } = mockLeaveTable({ data: { ...leaveRow, status: 'cancelled' as never }, error: null, status: 200 });

    const request = await cancelLeaveRequest('leave-1');

    expect(update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(eq).toHaveBeenCalledWith('id', 'leave-1');
    expect(request.status).toBe('cancelled');
  });

  it('says the request can no longer be cancelled when no row could be updated', async () => {
    mockLeaveTable({ data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' }, status: 406 });

    await expect(cancelLeaveRequest('leave-1')).rejects.toEqual({ message: content.errors.cannotCancel, statusCode: 406 });
  });
});

describe('mapLeaveErrorToApiError', () => {
  it.each([
    [{ code: '23514', message: 'leave must include at least one working day' }, content.errors.noWorkingDays],
    [{ code: '23514', message: 'new row violates check constraint "leave_requests_date_order"' }, content.errors.invalidRequest],
    [{ code: '42501', message: 'new row violates row-level security policy' }, content.errors.notAllowed],
    [{ code: 'XX000', message: 'internal error' }, content.errors.unexpected]
  ])('maps %o to a readable message', (error, message) => {
    expect(mapLeaveErrorToApiError(error, 400)).toEqual({ message, statusCode: 400 });
  });
});
