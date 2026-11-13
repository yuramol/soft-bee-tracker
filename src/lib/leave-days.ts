import { eachDayOfInterval, format, isWeekend, parseISO } from 'date-fns';

import type { LeaveAllowance, LeaveRequest, LeaveType } from '@/lib/api/leave';
import { toDateKey } from '@/lib/tracker-days';

export const LEAVE_TYPES: LeaveType[] = ['vacation', 'sick_leave'];

export function getLeaveWorkingDays(startDate: string, endDate: string): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (end < start) {
    return [];
  }

  return eachDayOfInterval({ start, end })
    .filter((date) => !isWeekend(date))
    .map(toDateKey);
}

export function countLeaveWorkingDays(startDate: string, endDate: string, year?: number): number {
  const days = getLeaveWorkingDays(startDate, endDate);

  return year === undefined ? days.length : days.filter((day) => day.startsWith(`${year}-`)).length;
}

export function formatLeaveDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);

  return startDate === endDate ? format(start, 'd MMM') : `${format(start, 'd MMM')} – ${format(parseISO(endDate), 'd MMM')}`;
}

export function getApprovedLeaveByDate(requests: LeaveRequest[]): Map<string, LeaveType> {
  const leaveByDate = new Map<string, LeaveType>();

  for (const request of requests) {
    if (request.status !== 'approved') {
      continue;
    }

    for (const day of getLeaveWorkingDays(request.startDate, request.endDate)) {
      leaveByDate.set(day, request.leaveType);
    }
  }

  return leaveByDate;
}

export function computeLeaveBalances(
  allowances: LeaveAllowance[],
  requests: LeaveRequest[],
  year: number
): Record<LeaveType, LeaveBalance> {
  return Object.fromEntries(
    LEAVE_TYPES.map((leaveType) => {
      const allowance = allowances.find((item) => item.year === year && item.leaveType === leaveType);
      const usedDays = sumRequestDays(requests, leaveType, 'approved', year);
      const pendingDays = sumRequestDays(requests, leaveType, 'pending', year);

      return [
        leaveType,
        {
          allowanceDays: allowance?.days ?? null,
          usedDays,
          pendingDays,
          remainingDays: allowance ? allowance.days - usedDays : null
        }
      ];
    })
  ) as Record<LeaveType, LeaveBalance>;
}

function sumRequestDays(requests: LeaveRequest[], leaveType: LeaveType, status: LeaveRequest['status'], year: number): number {
  return requests
    .filter((request) => request.leaveType === leaveType && request.status === status)
    .reduce((sum, request) => sum + countLeaveWorkingDays(request.startDate, request.endDate, year), 0);
}

export interface LeaveBalance {
  allowanceDays: number | null;
  usedDays: number;
  pendingDays: number;
  remainingDays: number | null;
}
