import { format, parseISO } from 'date-fns';
import { TriangleAlertIcon, UsersIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@ui/alert';
import { getFullName } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import type { LeaveConflict } from '@/lib/leave-conflicts';
import { formatLeaveDateRange } from '@/lib/leave-days';
import type { CrewMember } from '@/lib/api/crew';
import content from '../content.json';

export function LeaveConflicts({ conflicts, membersById }: LeaveConflictsProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2 sm:ml-13'>
      {conflicts.map((conflict) => (
        <Alert key={conflict.projectId} variant={conflict.uncoveredDays.length > 0 ? 'destructive' : 'default'}>
          {conflict.uncoveredDays.length > 0 ? <TriangleAlertIcon /> : <UsersIcon />}
          <AlertTitle>
            {conflict.uncoveredDays.length > 0
              ? formatText(content.leave.conflicts.uncovered, {
                  project: conflict.projectName,
                  days: formatDays(conflict.uncoveredDays)
                })
              : formatText(content.leave.conflicts.alsoAway, { project: conflict.projectName })}
          </AlertTitle>
          {conflict.overlaps.length > 0 ? (
            <AlertDescription>
              <ul className='flex flex-col gap-0.5'>
                {conflict.overlaps.map(({ request }) => {
                  const member = membersById.get(request.memberId);

                  return (
                    <li key={request.id}>
                      {formatText(content.leave.conflicts.overlap, {
                        name: member ? getFullName(member) : content.leave.conflicts.unknownPerson,
                        type: content.leave.types[request.leaveType],
                        dates: formatLeaveDateRange(request.startDate, request.endDate),
                        status: content.leave.status[request.status]
                      })}
                    </li>
                  );
                })}
              </ul>
            </AlertDescription>
          ) : null}
        </Alert>
      ))}
    </div>
  );
}

function formatDays(days: string[]): string {
  const labels = days.slice(0, MAX_LISTED_DAYS).map((day) => format(parseISO(day), 'd MMM'));
  const rest = days.length - labels.length;

  return rest > 0 ? formatText(content.leave.conflicts.moreDays, { days: labels.join(', '), count: rest }) : labels.join(', ');
}

const MAX_LISTED_DAYS = 4;

interface LeaveConflictsProps {
  conflicts: LeaveConflict[];
  membersById: Map<string, CrewMember>;
}
