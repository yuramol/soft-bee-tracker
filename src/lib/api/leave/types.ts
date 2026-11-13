import type { Database } from '@/types';

export type LeaveType = Database['public']['Enums']['leave_type'];

export type LeaveStatus = Database['public']['Enums']['leave_status'];

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

export interface CreateLeaveRequestInput {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  note: string | null;
}
