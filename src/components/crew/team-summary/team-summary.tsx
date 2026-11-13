import { format, parseISO } from 'date-fns';
import { ChartColumnIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@ui/button';
import type { TeamTimeSummary } from '@/lib/crew';
import { formatClock } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { getPeriodRange } from '@/lib/tracker-summary';
import content from '../content.json';

export function TeamSummary({ summary, peopleCount, today, reportHref }: TeamSummaryProps) {
  return (
    <section aria-labelledby='team-summary-title' className='bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5'>
      <div className='flex flex-col gap-0.5'>
        <h2 id='team-summary-title' className='font-semibold'>
          {content.summary.title}
        </h2>
        <p className='text-muted-foreground text-sm'>
          {formatWeekRange(today)} · {formatText(content.summary.scope, { count: peopleCount })}
        </p>
      </div>

      <div className='flex items-baseline justify-between gap-3 border-t pt-4'>
        <span className='font-semibold'>{content.summary.trackedTime}</span>
        <span className='text-2xl font-semibold tabular-nums'>{formatClock(summary.totalMinutes)}</span>
      </div>

      {summary.projects.length > 0 ? (
        <dl className='flex flex-col gap-3'>
          {summary.projects.map((item) => (
            <div key={item.project} className='flex items-baseline justify-between gap-3 text-sm'>
              <dt className='truncate'>{item.project}</dt>
              <dd className='tabular-nums'>{formatClock(item.minutes)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className='text-muted-foreground text-sm'>{content.summary.empty}</p>
      )}

      <Button variant='outline' className='mt-2 w-full' render={<Link href={reportHref} />} nativeButton={false}>
        <ChartColumnIcon data-icon='inline-start' />
        {content.summary.openReport}
      </Button>
    </section>
  );
}

function formatWeekRange(today: Date): string {
  const range = getPeriodRange(today, 'week');
  const start = parseISO(range.start);
  const end = parseISO(range.end);

  return start.getMonth() === end.getMonth()
    ? `${format(start, 'd')}–${format(end, 'd MMM')}`
    : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`;
}

interface TeamSummaryProps {
  summary: TeamTimeSummary;
  peopleCount: number;
  today: Date;
  reportHref: string;
}
