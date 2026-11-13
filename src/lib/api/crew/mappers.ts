import { parseUserPositions } from '@/lib/api/auth/mappers';
import type { UserAccess } from '@/lib/api/auth/types';
import type {
  Crew,
  CrewLeaveAllowance,
  CrewLeaveRequest,
  CrewMember,
  CrewProject,
  CrewStatus,
  GrantLeaveInput
} from '@/lib/api/crew/types';
import type { Tracker } from '@/lib/api/trackers/types';
import { getPeriodRange, isDateKeyInRange } from '@/lib/tracker-summary';
import { getTrackerMinutes } from '@/lib/tracker-days';
import type { Database } from '@/types';

type Tables = Database['public']['Tables'];

export const CREW_USER_COLUMNS =
  'id, email, username, first_name, last_name, phone, linkedin, upwork, avatar_url, date_employment, positions, user_access(role, is_confirmed, is_blocked)';
export const CREW_PROJECT_COLUMNS = 'id, name, status, manager_id';
export const CREW_PROJECT_RATE_COLUMNS = 'project_id, user_id';
export const CREW_LEAVE_REQUEST_COLUMNS = 'id, user_id, leave_type, start_date, end_date, note, status';
export const CREW_LEAVE_ALLOWANCE_COLUMNS = 'id, user_id, year, leave_type, days';

export function buildCrew(rows: CrewRows, now: Date): Crew {
  const projects = buildCrewProjects(rows.projects, rows.projectRates);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const minutes = sumMemberMinutes(rows.trackers, projectsById, now);

  const members = rows.users.flatMap((row) => {
    if (!row.user_access) {
      return [];
    }

    const memberProjects = projects.filter(
      (project) => project.status === 'active' && (project.managerId === row.id || project.memberIds.includes(row.id))
    );

    return [
      {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        username: row.username,
        email: row.email,
        avatarUrl: row.avatar_url,
        role: row.user_access.role,
        position: getPosition(row.positions),
        status: getCrewStatus(row.user_access),
        phone: row.phone,
        linkedin: row.linkedin,
        upwork: row.upwork,
        employmentDate: row.date_employment,
        projects: memberProjects.map((project) => project.name).sort((a, b) => a.localeCompare(b)),
        managerIds: [...new Set(memberProjects.map((project) => project.managerId))].filter(
          (id): id is string => id !== null && id !== row.id
        ),
        weekMinutesByProject: minutes.week.get(row.id) ?? {},
        monthMinutes: minutes.month.get(row.id) ?? 0
      } satisfies CrewMember
    ];
  });

  return {
    members: members.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    projects,
    leaveRequests: rows.leaveRequests.map(mapCrewLeaveRequestRow),
    allowances: rows.allowances.map(mapCrewLeaveAllowanceRow)
  };
}

export function getCrewStatus(access: Pick<UserAccess, 'is_blocked' | 'is_confirmed'>): CrewStatus {
  if (access.is_blocked) {
    return 'blocked';
  }

  return access.is_confirmed ? 'active' : 'pending';
}

// the first day of the current week or month, whichever is earlier: the oldest
// time entry the crew totals need
export function getCrewTrackerStartDate(now: Date): string {
  const week = getPeriodRange(now, 'week').start;
  const month = getPeriodRange(now, 'month').start;

  return week < month ? week : month;
}

export function mapPositionToJson(position: string | null): Tables['users']['Update']['positions'] {
  const title = position?.trim();

  return title ? { titles: [title] } : null;
}

export function mapGrantLeaveInputToRow(input: GrantLeaveInput): Tables['leave_requests']['Insert'] {
  return {
    user_id: input.memberId,
    leave_type: input.leaveType,
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note,
    status: 'approved'
  };
}

function buildCrewProjects(projectRows: CrewProjectRow[], rateRows: CrewProjectRateRow[]): CrewProject[] {
  return projectRows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    managerId: row.manager_id,
    memberIds: rateRows.filter((rate) => rate.project_id === row.id).map((rate) => rate.user_id)
  }));
}

function sumMemberMinutes(trackers: Tracker[], projectsById: Map<string, CrewProject>, now: Date) {
  const weekRange = getPeriodRange(now, 'week');
  const monthRange = getPeriodRange(now, 'month');
  const week = new Map<string, Record<string, number>>();
  const month = new Map<string, number>();

  for (const tracker of trackers) {
    if (tracker.status === 'rejected') {
      continue;
    }

    const minutes = getTrackerMinutes(tracker, now);

    if (isDateKeyInRange(tracker.date, monthRange)) {
      month.set(tracker.userId, (month.get(tracker.userId) ?? 0) + minutes);
    }

    const projectName = projectsById.get(tracker.projectId)?.name;

    if (projectName && isDateKeyInRange(tracker.date, weekRange)) {
      const byProject = week.get(tracker.userId) ?? {};

      byProject[projectName] = (byProject[projectName] ?? 0) + minutes;
      week.set(tracker.userId, byProject);
    }
  }

  return { week, month };
}

function getPosition(value: Tables['users']['Row']['positions']): string | null {
  const titles =
    parseUserPositions(value)
      ?.titles.map((title) => title.trim())
      .filter(Boolean) ?? [];

  return titles.length > 0 ? titles.join(', ') : null;
}

function mapCrewLeaveRequestRow(row: CrewLeaveRequestRow): CrewLeaveRequest {
  return {
    id: row.id,
    memberId: row.user_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note,
    status: row.status
  };
}

function mapCrewLeaveAllowanceRow(row: CrewLeaveAllowanceRow): CrewLeaveAllowance {
  return {
    id: row.id,
    memberId: row.user_id,
    year: row.year,
    leaveType: row.leave_type,
    days: row.days
  };
}

export interface CrewUserRow extends Pick<
  Tables['users']['Row'],
  | 'id'
  | 'email'
  | 'username'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'linkedin'
  | 'upwork'
  | 'avatar_url'
  | 'date_employment'
  | 'positions'
> {
  user_access: Pick<UserAccess, 'role' | 'is_confirmed' | 'is_blocked'> | null;
}

type CrewProjectRow = Pick<Tables['projects']['Row'], 'id' | 'name' | 'status' | 'manager_id'>;
type CrewProjectRateRow = Pick<Tables['project_rates']['Row'], 'project_id' | 'user_id'>;
type CrewLeaveRequestRow = Pick<
  Tables['leave_requests']['Row'],
  'id' | 'user_id' | 'leave_type' | 'start_date' | 'end_date' | 'note' | 'status'
>;
type CrewLeaveAllowanceRow = Pick<Tables['leave_allowances']['Row'], 'id' | 'user_id' | 'year' | 'leave_type' | 'days'>;

export interface CrewRows {
  users: CrewUserRow[];
  projects: CrewProjectRow[];
  projectRates: CrewProjectRateRow[];
  trackers: Tracker[];
  leaveRequests: CrewLeaveRequestRow[];
  allowances: CrewLeaveAllowanceRow[];
}
