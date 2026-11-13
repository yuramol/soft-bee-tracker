import type { LeaveType } from '@/lib/api/leave/types';
import type { ProjectRecord } from '@/lib/api/projects/types';
import type { ProjectPerson } from '@/lib/api/users/types';

// tracked minutes of one person on one project, summed over the requested range
export interface ReportTimeEntry {
  memberId: string;
  projectId: string;
  minutes: number;
}

// approved leave that overlaps the requested range; only approved leave counts as an absence
export interface ReportAbsence {
  id: string;
  memberId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
}

export interface ReportRangeInput {
  from: string;
  to: string;
}

export interface ReportSource {
  entries: ReportTimeEntry[];
  absences: ReportAbsence[];
  people: ProjectPerson[];
  projects: ProjectRecord[];
}
