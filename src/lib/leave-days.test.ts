import { describe, expect, it } from 'vitest';

import type { LeaveAllowance, LeaveRequest } from '@/mocks/leave.mock';
import { computeLeaveBalances, countLeaveWorkingDays, getApprovedLeaveByDate } from '@/lib/leave-days';

function request(overrides: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 'r1',
    leaveType: 'vacation',
    startDate: '2026-11-09',
    endDate: '2026-11-13',
    note: null,
    status: 'approved',
    ...overrides
  };
}

function allowance(overrides: Partial<LeaveAllowance>): LeaveAllowance {
  return { id: 'a1', year: 2026, leaveType: 'vacation', days: 20, ...overrides };
}

describe('countLeaveWorkingDays', () => {
  it('counts only Monday to Friday', () => {
    expect(countLeaveWorkingDays('2026-11-09', '2026-11-15')).toBe(5);
  });

  it('returns 0 for an inverted range', () => {
    expect(countLeaveWorkingDays('2026-11-10', '2026-11-09')).toBe(0);
  });

  it('limits the count to the given year', () => {
    expect(countLeaveWorkingDays('2026-12-30', '2027-01-05', 2026)).toBe(2);
    expect(countLeaveWorkingDays('2026-12-30', '2027-01-05', 2027)).toBe(3);
  });
});

describe('getApprovedLeaveByDate', () => {
  it('marks working days of approved requests only', () => {
    const result = getApprovedLeaveByDate([
      request({ startDate: '2026-11-13', endDate: '2026-11-16' }),
      request({ id: 'r2', status: 'pending', startDate: '2026-11-20', endDate: '2026-11-20' })
    ]);

    expect([...result.keys()]).toEqual(['2026-11-13', '2026-11-16']);
    expect(result.get('2026-11-13')).toBe('vacation');
  });
});

describe('computeLeaveBalances', () => {
  it('subtracts approved days from the allowance and reports pending separately', () => {
    const balances = computeLeaveBalances(
      [allowance({})],
      [request({}), request({ id: 'r2', status: 'pending', startDate: '2026-11-16', endDate: '2026-11-17' })],
      2026
    );

    expect(balances.vacation).toEqual({ allowanceDays: 20, usedDays: 5, pendingDays: 2, remainingDays: 15 });
  });

  it('returns null allowance and remaining when no policy is configured', () => {
    const balances = computeLeaveBalances([], [request({ leaveType: 'sick_leave' })], 2026);

    expect(balances.sick_leave).toEqual({ allowanceDays: null, usedDays: 5, pendingDays: 0, remainingDays: null });
  });

  it('ignores rejected and cancelled requests', () => {
    const balances = computeLeaveBalances(
      [allowance({})],
      [request({ status: 'rejected' }), request({ id: 'r2', status: 'cancelled' })],
      2026
    );

    expect(balances.vacation.remainingDays).toBe(20);
  });
});
