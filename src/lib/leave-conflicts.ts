import { getLeaveWorkingDays } from '@/lib/leave-days';
import type { CrewLeaveRequest, CrewProject } from '@/lib/api/crew';

// For each active project the person is on: who else is away on the same working days,
// and which days would leave the project with nobody available if this request is approved.
// Coverage uses everyone's leave, but named overlaps are limited to people the viewer may see
export function getLeaveConflicts(
  request: CrewLeaveRequest,
  requests: CrewLeaveRequest[],
  projects: ConflictProject[],
  visibleMemberIds: Set<string>
): LeaveConflict[] {
  const requestDays = getLeaveWorkingDays(request.startDate, request.endDate);
  const awayDaysByMember = collectAwayDays(requests.filter((item) => item.id !== request.id && AWAY_STATUSES.includes(item.status)));

  return projects
    .filter((project) => project.status === 'active' && project.memberIds.includes(request.memberId))
    .map((project) => {
      const colleagues = project.memberIds.filter((id) => id !== request.memberId);
      const overlaps = colleagues
        .filter((memberId) => visibleMemberIds.has(memberId))
        .flatMap((memberId) =>
          requests
            .filter((item) => item.memberId === memberId && item.id !== request.id && AWAY_STATUSES.includes(item.status))
            .map((item) => ({ request: item, days: countShared(requestDays, awayDaysByMember.get(memberId)?.get(item.id)) }))
            .filter((overlap) => overlap.days > 0)
        );
      // a one-person project is not flagged: there is nobody to combine absences with
      const uncoveredDays =
        colleagues.length === 0
          ? []
          : requestDays.filter((day) => colleagues.every((memberId) => isAwayOn(awayDaysByMember.get(memberId), day)));

      return { projectId: project.id, projectName: project.name, overlaps, uncoveredDays };
    })
    .filter((conflict) => conflict.overlaps.length > 0 || conflict.uncoveredDays.length > 0)
    .sort((a, b) => b.uncoveredDays.length - a.uncoveredDays.length || a.projectName.localeCompare(b.projectName));
}

function collectAwayDays(requests: CrewLeaveRequest[]): Map<string, Map<string, Set<string>>> {
  const byMember = new Map<string, Map<string, Set<string>>>();

  for (const request of requests) {
    const byRequest = byMember.get(request.memberId) ?? new Map<string, Set<string>>();

    byRequest.set(request.id, new Set(getLeaveWorkingDays(request.startDate, request.endDate)));
    byMember.set(request.memberId, byRequest);
  }

  return byMember;
}

function isAwayOn(byRequest: Map<string, Set<string>> | undefined, day: string): boolean {
  return byRequest ? [...byRequest.values()].some((days) => days.has(day)) : false;
}

function countShared(days: string[], other: Set<string> | undefined): number {
  return other ? days.filter((day) => other.has(day)).length : 0;
}

// pending requests count too, so a reviewer sees the risk before approving both
const AWAY_STATUSES: CrewLeaveRequest['status'][] = ['approved', 'pending'];

export interface LeaveOverlap {
  request: CrewLeaveRequest;
  days: number;
}

export interface LeaveConflict {
  projectId: string;
  projectName: string;
  overlaps: LeaveOverlap[];
  uncoveredDays: string[];
}

// only what the coverage check reads, so both real crew projects and test fixtures fit
export type ConflictProject = Pick<CrewProject, 'id' | 'name' | 'status' | 'memberIds'>;
