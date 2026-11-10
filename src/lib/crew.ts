import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth';
import { computeLeaveBalances, type LeaveBalance } from '@/lib/leave-days';
import type { LeaveAllowance, LeaveType } from '@/mocks/leave.mock';
import type { CrewLeaveRequest, CrewMember, CrewStatus, CrewViewer } from '@/mocks/crew.mock';

export function getCrewPermissions(role: UserRole): CrewPermissions {
  return CREW_PERMISSIONS[role];
}

export function getVisibleMembers(members: CrewMember[], viewer: CrewViewer): CrewMember[] {
  if (viewer.role === 'admin') {
    return members;
  }

  if (viewer.role === 'manager') {
    return members.filter((member) => member.managerId === viewer.id);
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
  return [...new Set(members.map((member) => member.position))].sort((a, b) => a.localeCompare(b));
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
  return computeLeaveBalances(
    allowances,
    requests.map((request) => ({ ...request, note: null })),
    year
  );
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
