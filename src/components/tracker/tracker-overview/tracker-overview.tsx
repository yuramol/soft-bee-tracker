'use client';

import { CalendarDaysIcon, CalendarRangeIcon, TimerIcon } from 'lucide-react';

import { StatCard } from '@components/common/stat-card/stat-card';
import { Progress } from '@ui/progress';
import { Skeleton } from '@ui/skeleton';
import { useLiveMinuteNow } from '@/hooks/use-live-minute-now';
import { useTrackers } from '@/lib/api/trackers';
import { formatDuration, toPercent } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { isLiveTrackerActive } from '@/lib/live-tracker';
import { buildTrackerSummary, DAILY_NORM_MINUTES } from '@/lib/tracker-days';
import content from '../content.json';

export function TrackerOverview() {
  const { data: trackers = [], isLoading } = useTrackers();
  const runningStartDate =
    trackers.find((tracker) => isLiveTrackerActive(tracker) && tracker.liveStatus === 'start')?.startLiveDate ?? null;
  const now = useLiveMinuteNow(runningStartDate);

  if (isLoading) {
    return <TrackerOverviewSkeleton />;
  }

  const summary = buildTrackerSummary(trackers, now);

  return (
    <section aria-label={content.overview.label} className='grid gap-4 sm:grid-cols-3'>
      <StatCard
        isHighlighted
        label={content.overview.today}
        icon={TimerIcon}
        value={formatDuration(summary.todayMinutes)}
        hint={formatText(content.overview.dailyNorm, { norm: formatDuration(DAILY_NORM_MINUTES) })}
        footer={<NormProgress value={summary.todayMinutes} total={DAILY_NORM_MINUTES} isOnDark />}
      />
      <StatCard
        label={content.overview.thisWeek}
        icon={CalendarRangeIcon}
        value={formatDuration(summary.weekMinutes)}
        hint={formatText(content.overview.of, { total: formatDuration(summary.weekNormMinutes) })}
        footer={<NormProgress value={summary.weekMinutes} total={summary.weekNormMinutes} />}
      />
      <StatCard
        label={content.overview.thisMonth}
        icon={CalendarDaysIcon}
        value={formatDuration(summary.monthMinutes)}
        hint={formatText(content.overview.of, { total: formatDuration(summary.monthNormMinutes) })}
        footer={<NormProgress value={summary.monthMinutes} total={summary.monthNormMinutes} />}
      />
    </section>
  );
}

function TrackerOverviewSkeleton() {
  return (
    <section aria-label={content.overview.label} className='grid gap-4 sm:grid-cols-3'>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className='h-36 rounded-2xl' />
      ))}
    </section>
  );
}

function NormProgress({ value, total, isOnDark = false }: NormProgressProps) {
  return (
    <Progress
      value={toPercent(value, total)}
      aria-label={content.overview.progressLabel}
      className={
        isOnDark
          ? '[&_[data-slot=progress-indicator]]:bg-electric-green [&_[data-slot=progress-track]]:bg-brand-white/15'
          : '[&_[data-slot=progress-indicator]]:bg-deep-teal dark:[&_[data-slot=progress-indicator]]:bg-electric-green'
      }
    />
  );
}

interface NormProgressProps {
  value: number;
  total: number;
  isOnDark?: boolean;
}
