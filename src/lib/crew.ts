import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth';
import { computeLeaveBalances, type LeaveBalance } from '@/lib/leave-days';
import type { CrewLeaveRequest, CrewMember, CrewStatus, CrewViewer } from '@/lib/api/crew';
import type { LeaveAllowance, LeaveType } from '@/lib/api/leave';

export function getCrewPermissions(role: UserRole): CrewPermissions {
  return CREW_PERMISSIONS[role];
}

// managers and admins see everyone, the same scope rls gives them on profiles,
// time entries and leave; staff never reach the crew page
export function getVisibleMembers(members: CrewMember[], viewer: CrewViewer): CrewMember[] {
  if (viewer.role === 'admin' || viewer.role === 'manager') {
    return members;
  }

  return members.filter((member) => member.id === viewer.id);
}

export function filterMembers(members: CrewMember[], filters: CrewFilters): CrewMember[] {
  const query = filters.query.trim().toLowerCase();

  return members.filter((member) => {
    const matchesQuery = !query || `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase().includes(query);
    const matchesRole = filters.role === ALL_FILTER || member.role === filters.role;
    const matchesPosition = filters.position === ALL_FILTER || member.position === filters.position;
    const matchesStatus = filters.status === ALL_FILTER || member.status === filters.status;

    return matchesQuery && matchesRole && matchesPosition && matchesStatus;
  });
}

export function getPositions(members: CrewMember[]): string[] {
  return [...new Set(members.flatMap((member) => (member.position ? [member.position] : [])))].sort((a, b) => a.localeCompare(b));
}

export function summarizeTeamTime(members: CrewMember[]): TeamTimeSummary {
  const minutesByProject = new Map<string, number>();

  for (const member of members) {
    for (const [project, minutes] of Object.entries(member.weekMinutesByProject)) {
      minutesByProject.set(project, (minutesByProject.get(project) ?? 0) + minutes);
    }
  }

  const projects = [...minutesByProject.entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([project, minutes]) => ({ project, minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.project.localeCompare(b.project));

  return { projects, totalMinutes: projects.reduce((sum, item) => sum + item.minutes, 0) };
}

export function getVisibleLeaveRequests(requests: CrewLeaveRequest[], visibleMembers: CrewMember[]): CrewLeaveRequest[] {
  const memberIds = new Set(visibleMembers.map((member) => member.id));

  return requests.filter((request) => memberIds.has(request.memberId)).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function countPendingLeave(requests: CrewLeaveRequest[]): number {
  return requests.filter((request) => request.status === 'pending').length;
}

export function getFullName(member: Pick<CrewMember, 'firstName' | 'lastName'>): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

// managers of the person's active projects, by name, for the "Manager" line
export function getManagerNames(member: Pick<CrewMember, 'managerIds'>, membersById: Map<string, CrewMember>): string[] {
  return member.managerIds.flatMap((id) => {
    const manager = membersById.get(id);

    return manager ? [getFullName(manager)] : [];
  });
}

// managers can't decide on their own leave (the database refuses it); admins can
export function canReviewLeaveRequest(request: Pick<CrewLeaveRequest, 'memberId' | 'status'>, viewer: CrewViewer): boolean {
  return request.status === 'pending' && (viewer.role === 'admin' || (viewer.role === 'manager' && request.memberId !== viewer.id));
}

export function getMemberProfileHref(memberId: string): string {
  return `${ROUTES.PROFILE}/${encodeURIComponent(memberId)}`;
}

// Profile links come from user input, so only plain web URLs are rendered as links
export function toSafeExternalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function computeMemberLeaveBalances(
  requests: CrewLeaveRequest[],
  allowances: LeaveAllowance[],
  year: number
): Record<LeaveType, LeaveBalance> {
  return computeLeaveBalances(allowances, requests, year);
}

export const ALL_FILTER = 'all';

export const DEFAULT_CREW_FILTERS: CrewFilters = { query: '', role: ALL_FILTER, position: ALL_FILTER, status: ALL_FILTER };

const CREW_PERMISSIONS: Record<UserRole, CrewPermissions> = {
  admin: { canViewCrew: true, canInvite: true, canManageMembers: true, canReviewLeave: true },
  manager: { canViewCrew: true, canInvite: false, canManageMembers: false, canReviewLeave: true },
  worker: { canViewCrew: false, canInvite: false, canManageMembers: false, canReviewLeave: false }
};

export interface CrewPermissions {
  canViewCrew: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
  canReviewLeave: boolean;
}

export interface CrewFilters {
  query: string;
  role: UserRole | typeof ALL_FILTER;
  position: string;
  status: CrewStatus | typeof ALL_FILTER;
}

export interface TeamTimeSummary {
  projects: Array<{ project: string; minutes: number }>;
  totalMinutes: number;
}
