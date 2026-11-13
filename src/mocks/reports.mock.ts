import { addDays, eachDayOfInterval, isWeekend, parseISO, startOfWeek, subDays } from 'date-fns';

import { toDateKey } from '@/lib/tracker-days';
import { MOCK_CREW_LEAVE_REQUESTS } from '@/mocks/crew.mock';
import type { LeaveType } from '@/lib/api/leave';
import { MOCK_PROJECTS } from '@/mocks/projects.mock';

// Layout-only mock until reports get their backend task. Entries are generated from the
// weekly hours in MOCK_PROJECTS, so Crew, Projects and Reports tell the same story.
// declared first: the builders below run at module load
const MOCK_HISTORY_DAYS = 120;

export const MOCK_REPORT_ABSENCES: ReportAbsence[] = buildMockAbsences(new Date());

export const MOCK_REPORT_ENTRIES: ReportTimeEntry[] = buildMockEntries(new Date(), MOCK_REPORT_ABSENCES);

function buildMockAbsences(today: Date): ReportAbsence[] {
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const relative: ReportAbsence[] = [
    { id: 'ra1', memberId: 'u3', leaveType: 'sick_leave', startDate: toDateKey(monday), endDate: toDateKey(monday) },
    {
      id: 'ra2',
      memberId: 'u6',
      leaveType: 'vacation',
      startDate: toDateKey(addDays(monday, -4)),
      endDate: toDateKey(addDays(monday, -3))
    },
    {
      id: 'ra3',
      memberId: 'u4',
      leaveType: 'vacation',
      startDate: toDateKey(addDays(monday, -21)),
      endDate: toDateKey(addDays(monday, -17))
    },
    {
      id: 'ra4',
      memberId: 'u1',
      leaveType: 'sick_leave',
      startDate: toDateKey(addDays(monday, -12)),
      endDate: toDateKey(addDays(monday, -12))
    }
  ];
  const approvedCrewLeave = MOCK_CREW_LEAVE_REQUESTS.filter((request) => request.status === 'approved').map((request) => ({
    id: request.id,
    memberId: request.memberId,
    leaveType: request.leaveType,
    startDate: request.startDate,
    endDate: request.endDate
  }));

  return [...relative, ...approvedCrewLeave];
}

function buildMockEntries(today: Date, absences: ReportAbsence[]): ReportTimeEntry[] {
  const absentDays = new Set(
    absences.flatMap((absence) =>
      eachDayOfInterval({ start: parseISO(absence.startDate), end: parseISO(absence.endDate) }).map(
        (date) => `${absence.memberId}:${toDateKey(date)}`
      )
    )
  );
  const workDays = eachDayOfInterval({ start: subDays(today, MOCK_HISTORY_DAYS), end: today }).filter((date) => !isWeekend(date));
  const entries: ReportTimeEntry[] = [];

  for (const project of MOCK_PROJECTS) {
    for (const [memberId, weekMinutes] of Object.entries(project.weekMinutesByMember)) {
      const dailyMinutes = Math.round(weekMinutes / 5 / 15) * 15;

      workDays.forEach((date, dayIndex) => {
        const dateKey = toDateKey(date);

        if (absentDays.has(`${memberId}:${dateKey}`)) {
          return;
        }

        // deterministic wobble of ±30 minutes so days do not all look identical
        const wobble = (((dayIndex * 7 + memberId.charCodeAt(1) * 13) % 5) - 2) * 15;

        entries.push({
          id: `${project.id}-${memberId}-${dateKey}`,
          memberId,
          projectId: project.id,
          date: dateKey,
          minutes: Math.max(15, dailyMinutes + wobble)
        });
      });
    }
  }

  return entries;
}

export interface ReportTimeEntry {
  id: string;
  memberId: string;
  projectId: string;
  date: string;
  minutes: number;
}

// Only approved leave counts as an absence
export interface ReportAbsence {
  id: string;
  memberId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
}
