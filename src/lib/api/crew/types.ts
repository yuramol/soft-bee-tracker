import type { UserRole } from '@/lib/api/auth/types';
import type { LeaveAllowance, LeaveStatus, LeaveType } from '@/lib/api/leave/types';
import type { Database } from '@/types';

export type CrewStatus = 'pending' | 'active' | 'blocked';

export interface CrewMember {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  position: string | null;
  status: CrewStatus;
  phone: string | null;
  linkedin: string | null;
  upwork: string | null;
  employmentDate: string | null;
  // names of active projects the person works on or manages
  projects: string[];
  // managers of those projects, the person themselves excluded
  managerIds: string[];
  weekMinutesByProject: Record<string, number>;
  monthMinutes: number;
}

export interface CrewProject {
  id: string;
  name: string;
  status: Database['public']['Enums']['project_status'];
  managerId: string | null;
  memberIds: string[];
}

export interface CrewLeaveRequest {
  id: string;
  memberId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  note: string | null;
  status: LeaveStatus;
}

export interface CrewLeaveAllowance extends LeaveAllowance {
  memberId: string;
}

export interface Crew {
  members: CrewMember[];
  projects: CrewProject[];
  leaveRequests: CrewLeaveRequest[];
  allowances: CrewLeaveAllowance[];
}

export interface CrewViewer {
  id: string;
  role: UserRole;
}

export interface ChangeMemberRoleInput {
  memberId: string;
  role: UserRole;
}

export interface SetMemberBlockedInput {
  memberId: string;
  isBlocked: boolean;
}

export interface UpdateMemberEmploymentInput {
  memberId: string;
  position?: string | null;
  employmentDate?: string | null;
}

export interface ReviewLeaveRequestInput {
  requestId: string;
  decision: Extract<LeaveStatus, 'approved' | 'rejected'>;
}

export interface GrantLeaveInput {
  memberId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  note: string | null;
}

export interface SetLeaveAllowanceInput {
  memberId: string;
  year: number;
  leaveType: LeaveType;
  days: number;
}
