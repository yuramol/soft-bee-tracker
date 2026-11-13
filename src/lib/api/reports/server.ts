import 'server-only';

import { mapProjectMemberRows, mapProjectsRowsToProjects, PROJECT_COLUMNS, toProjectRecords } from '@/lib/api/projects/mappers';
import type { ReportRangeInput, ReportSource } from '@/lib/api/reports/types';
import { mapProjectPersonRows } from '@/lib/api/users/mappers';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiError } from '@/types/api-error';

// imported via '@/lib/api/reports/server' (not the barrel) so client bundles never pull in next/headers.
// RLS scopes every read to the viewer: projects they see, people they may name, time and leave they may read.
// Time is summed in the database; the other reads are plain lists and are cut off at the API max_rows (1000)
export async function getReportSource({ from, to }: ReportRangeInput): Promise<ReportSource> {
  const supabase = await createServerClient();
  const [time, leave, projects, members, people] = await Promise.all([
    supabase.rpc('get_report_time', { from_date: from, to_date: to }),
    // approved leave that overlaps the range; working days inside it are counted in buildReport
    supabase.from('leave_requests').select(REPORT_LEAVE_COLUMNS).eq('status', 'approved').lte('start_date', to).gte('end_date', from),
    supabase.from('projects').select(PROJECT_COLUMNS),
    supabase.rpc('get_project_members'),
    supabase.rpc('get_project_people')
  ]);
  const failed = [time, leave, projects, members, people].find((result) => result.error);

  if (failed?.error) {
    throw {
      message: failed.error.message,
      statusCode: failed.status
    } satisfies ApiError;
  }

  return {
    entries: (time.data ?? []).map((row) => ({ memberId: row.user_id, projectId: row.project_id, minutes: row.minutes })),
    absences: (leave.data ?? []).map((row) => ({
      id: row.id,
      memberId: row.user_id,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date
    })),
    people: mapProjectPersonRows(people.data ?? []),
    projects: toProjectRecords(mapProjectsRowsToProjects(projects.data ?? []), mapProjectMemberRows(members.data ?? []))
  };
}

const REPORT_LEAVE_COLUMNS = 'id, user_id, leave_type, start_date, end_date';
