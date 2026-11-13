import { addDays, addMonths, format, startOfWeek } from 'date-fns';

// Layout-only mock until leave gets its own backend task
export const MOCK_LEAVE_ALLOWANCES: LeaveAllowance[] = [
  { id: 'allowance-vacation', year: new Date().getFullYear(), leaveType: 'vacation', days: 20 },
  { id: 'allowance-sick', year: new Date().getFullYear(), leaveType: 'sick_leave', days: 10 }
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = buildMockLeaveRequests(new Date());

function buildMockLeaveRequests(today: Date): LeaveRequest[] {
  const lastMonday = addDays(startOfWeek(today, { weekStartsOn: 1 }), -7);
  const nextMonth = startOfWeek(addMonths(today, 1), { weekStartsOn: 1 });

  return [
    {
      id: 'leave-vacation-approved',
      leaveType: 'vacation',
      startDate: toKey(addDays(lastMonday, 3)),
      endDate: toKey(addDays(lastMonday, 4)),
      note: null,
      status: 'approved'
    },
    {
      id: 'leave-sick-approved',
      leaveType: 'sick_leave',
      startDate: toKey(addDays(lastMonday, -7)),
      endDate: toKey(addDays(lastMonday, -7)),
      note: null,
      status: 'approved'
    },
    {
      id: 'leave-vacation-pending',
      leaveType: 'vacation',
      startDate: toKey(nextMonth),
      endDate: toKey(addDays(nextMonth, 4)),
      note: 'Family trip',
      status: 'pending'
    }
  ];
}

function toKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export type LeaveType = 'vacation' | 'sick_leave';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  note: string | null;
  status: LeaveStatus;
}

export interface LeaveAllowance {
  id: string;
  year: number;
  leaveType: LeaveType;
  days: number;
}
