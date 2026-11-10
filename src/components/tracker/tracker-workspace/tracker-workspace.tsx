'use client';

import { startOfMonth } from 'date-fns';
import { useState, useSyncExternalStore, type ReactNode } from 'react';

import { DayEntries } from '@components/tracker/day-entries/day-entries';
import { LeavePanel } from '@components/tracker/leave-panel/leave-panel';
import { TrackerCalendar } from '@components/tracker/tracker-calendar/tracker-calendar';
import { TrackerSummary } from '@components/tracker/tracker-summary/tracker-summary';
import { Skeleton } from '@ui/skeleton';
import { useLiveMinuteNow } from '@/hooks/use-live-minute-now';
import { useTrackers } from '@/lib/api/trackers';
import { getApprovedLeaveByDate } from '@/lib/leave-days';
import { isLiveTrackerActive } from '@/lib/live-tracker';
import { sumMinutesByDate, toDateKey } from '@/lib/tracker-days';
import type { SummaryPeriod } from '@/lib/tracker-summary';
import { MOCK_LEAVE_ALLOWANCES, MOCK_LEAVE_REQUESTS } from '@/mocks/leave.mock';

export function TrackerWorkspace({ header }: TrackerWorkspaceProps) {
  const isClient = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  if (!isClient) {
    return (
      <div className={WORKSPACE_GRID_CLASS}>
        <div className='flex flex-col gap-6'>
          {header}
          <Skeleton className='h-[32rem] rounded-2xl' />
        </div>
        <div className='flex flex-col gap-6'>
          <Skeleton className='h-56 rounded-2xl' />
          <Skeleton className='h-64 rounded-2xl' />
        </div>
      </div>
    );
  }

  return <TrackerWorkspaceContent header={header} />;
}

function TrackerWorkspaceContent({ header }: TrackerWorkspaceProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [period, setPeriod] = useState<SummaryPeriod>('day');
  const { data: trackers = [], isLoading, error, refetch } = useTrackers();
  const runningStartDate =
    trackers.find((tracker) => isLiveTrackerActive(tracker) && tracker.liveStatus === 'start')?.startLiveDate ?? null;
  const now = useLiveMinuteNow(runningStartDate);
  const minutesByDate = sumMinutesByDate(trackers, now);
  const leaveRequests = MOCK_LEAVE_REQUESTS;
  const leaveByDate = getApprovedLeaveByDate(leaveRequests);

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    setVisibleMonth(startOfMonth(date));
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <div className={WORKSPACE_GRID_CLASS}>
      <div className='flex min-w-0 flex-col gap-6 lg:self-stretch'>
        {header}
        {/* Sticky on desktop; scrolls inside when the day has more entries than fit on screen */}
        <div className='lg:sticky lg:top-20 lg:-mx-1 lg:max-h-[calc(100svh-6.5rem)] lg:overflow-y-auto lg:px-1'>
          <DayEntries
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            trackers={trackers}
            minutesByDate={minutesByDate}
            leaveByDate={leaveByDate}
            now={now}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        </div>
      </div>

      <aside className='grid items-start gap-6 sm:grid-cols-2 lg:flex lg:flex-col lg:items-stretch'>
        <div className='sm:col-span-2'>
          <LeavePanel requests={leaveRequests} allowances={MOCK_LEAVE_ALLOWANCES} today={now} />
        </div>
        <TrackerSummary
          period={period}
          onPeriodChange={setPeriod}
          trackers={trackers}
          leaveByDate={leaveByDate}
          now={now}
          isLoading={isLoading}
          error={error}
        />
        <TrackerCalendar
          visibleMonth={visibleMonth}
          onVisibleMonthChange={setVisibleMonth}
          selectedDate={toDateKey(selectedDate)}
          onSelectDate={handleSelectDate}
          minutesByDate={minutesByDate}
          isLoading={isLoading}
          hasError={Boolean(error)}
        />
      </aside>
    </div>
  );
}

function subscribeNoop(): () => void {
  return () => undefined;
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

const WORKSPACE_GRID_CLASS = 'grid items-start gap-6 lg:gap-x-12 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]';

interface TrackerWorkspaceProps {
  header: ReactNode;
}
