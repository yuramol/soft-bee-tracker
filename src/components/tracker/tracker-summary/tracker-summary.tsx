'use client';

import { format, parseISO } from 'date-fns';

import { formatDayCount } from '@components/tracker/format-day-count';
import { Skeleton } from '@ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs';
import { useProjects } from '@/lib/api/projects';
import type { Tracker } from '@/lib/api/trackers';
import { formatClock } from '@/lib/format-duration';
import { getPeriodRange, isDateKeyInRange, summarizeTrackersByProject, type DateKeyRange, type SummaryPeriod } from '@/lib/tracker-summary';
import type { LeaveType } from '@/lib/api/leave';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function TrackerSummary({ period, onPeriodChange, trackers, leaveByDate, now, isLoading, error }: TrackerSummaryProps) {
  const { data: projects = [] } = useProjects();
  const range = getPeriodRange(now, period);
  const summary = summarizeTrackersByProject(trackers, range, now);
  const leaveDays = [...leaveByDate.keys()].filter((key) => isDateKeyInRange(key, range)).length;
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  function handlePeriodChange(value: string | number | null) {
    if (isSummaryPeriod(value)) {
      onPeriodChange(value);
    }
  }

  return (
    <section aria-label={content.summary.label} className='bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5'>
      <Tabs value={period} onValueChange={handlePeriodChange}>
        <TabsList className='w-full'>
          {PERIODS.map((item) => (
            <TabsTrigger key={item} value={item}>
              {content.summary.periods[item]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className='text-muted-foreground text-sm'>{formatRange(range, period)}</p>

      {isLoading ? <SummarySkeleton /> : null}
      {!isLoading && error ? (
        <p role='alert' className='text-destructive text-sm'>
          {error.message}
        </p>
      ) : null}
      {!isLoading && !error ? (
        <>
          {summary.projects.length > 0 ? (
            <dl className='flex flex-col gap-3'>
              {summary.projects.map((item) => (
                <div key={item.projectId} className='flex items-baseline justify-between gap-3 text-sm'>
                  <dt className='truncate'>{projectNames.get(item.projectId) ?? content.fallbackProjectName}</dt>
                  <dd className='tabular-nums'>{formatClock(item.minutes)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className='text-muted-foreground text-sm'>{content.summary.empty}</p>
          )}

          <div className='flex items-baseline justify-between gap-3 border-t pt-4'>
            <span className='font-semibold'>{content.summary.total}</span>
            <span className='text-xl font-semibold tabular-nums'>{formatClock(summary.totalMinutes)}</span>
          </div>

          {leaveDays > 0 ? (
            <div className='bg-info/10 flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm'>
              <span className='flex flex-col'>
                <span className='text-info font-medium'>{content.summary.leaveDays}</span>
                <span className='text-muted-foreground text-xs'>{content.summary.leaveHint}</span>
              </span>
              <span className='text-info font-medium tabular-nums'>{formatDayCount(leaveDays)}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function SummarySkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      <Skeleton className='h-5 w-full' />
      <Skeleton className='h-5 w-4/5' />
      <Skeleton className='h-7 w-full' />
    </div>
  );
}

function formatRange(range: DateKeyRange, period: SummaryPeriod): string {
  const start = parseISO(range.start);
  const end = parseISO(range.end);

  if (period === 'day') {
    return format(start, 'EEEE, d MMMM');
  }

  if (period === 'month') {
    return format(start, 'MMMM yyyy');
  }

  return `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`;
}

function isSummaryPeriod(value: string | number | null): value is SummaryPeriod {
  return typeof value === 'string' && (PERIODS as string[]).includes(value);
}

const PERIODS: SummaryPeriod[] = ['day', 'week', 'month'];

interface TrackerSummaryProps {
  period: SummaryPeriod;
  onPeriodChange: (period: SummaryPeriod) => void;
  trackers: Tracker[];
  leaveByDate: Map<string, LeaveType>;
  now: Date;
  isLoading: boolean;
  error: ApiError | null;
}
