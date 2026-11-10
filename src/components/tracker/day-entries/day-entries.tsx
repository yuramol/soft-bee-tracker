'use client';

import { addDays, format, isAfter, isSameDay, isWeekend, startOfDay } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, PalmtreeIcon } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { EmptyState } from '@components/common/empty-state/empty-state';
import { ErrorState } from '@components/common/error-state/error-state';
import { ListSkeleton } from '@components/common/loading-state/skeletons';
import { CreateTrackerDialog } from '@components/tracker/create-tracker-dialog/create-tracker-dialog';
import { TrackerEntryRow } from '@components/tracker/day-entries/tracker-entry-row';
import { EditTrackerDialog } from '@components/tracker/edit-tracker-dialog/edit-tracker-dialog';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import { useProjects } from '@/lib/api/projects';
import { useActiveLiveTracker, useDeleteTracker, useRestartLiveTracker } from '@/lib/api/trackers';
import type { Tracker } from '@/lib/api/trackers';
import { formatClock, formatDuration } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { getWeekDays, toDateKey } from '@/lib/tracker-days';
import { cn } from '@/lib/utils';
import type { LeaveType } from '@/mocks/leave.mock';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function DayEntries({
  selectedDate,
  onSelectDate,
  trackers,
  minutesByDate,
  leaveByDate,
  now,
  isLoading,
  error,
  onRetry
}: DayEntriesProps) {
  const [pendingAction, setPendingAction] = useState<PendingEntryAction | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const { data: activeTracker } = useActiveLiveTracker();
  const restartTracker = useRestartLiveTracker();
  const deleteTracker = useDeleteTracker({ onSuccess: handleDeleted });
  const selectedKey = toDateKey(selectedDate);
  const dayEntries = trackers.filter((tracker) => tracker.date === selectedKey);
  const dayMinutes = minutesByDate.get(selectedKey) ?? 0;
  const dayLeave = leaveByDate.get(selectedKey);
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const isFutureDay = isAfter(startOfDay(selectedDate), startOfDay(now));
  const isReady = !isLoading && !error;
  const hasEntries = isReady && dayEntries.length > 0;

  function openEntryAction(type: EntryActionType, tracker: Tracker) {
    setPendingAction({ type, tracker, openedAt: Date.now() });
    setIsActionDialogOpen(true);
  }

  function handleEdit(tracker: Tracker) {
    openEntryAction('edit', tracker);
  }

  function handleDelete(tracker: Tracker) {
    openEntryAction('delete', tracker);
  }

  function handlePlay(tracker: Tracker) {
    restartTracker.mutate(tracker);
  }

  function handleDeleteConfirm() {
    if (pendingAction) {
      deleteTracker.mutate(pendingAction.tracker);
    }
  }

  function handleDeleted() {
    setIsActionDialogOpen(false);
  }

  return (
    <section aria-label={content.dayEntries.label} className='flex flex-col gap-5 py-2'>
      <DayNavigator selectedDate={selectedDate} now={now} onSelectDate={onSelectDate} />

      <WeekStrip
        selectedDate={selectedDate}
        now={now}
        minutesByDate={minutesByDate}
        leaveByDate={leaveByDate}
        isLoading={isLoading}
        hasError={Boolean(error)}
        onSelectDate={onSelectDate}
      />

      <div className='flex flex-col gap-4 border-t pt-5'>
        <div className='flex min-h-9 items-center justify-between gap-3'>
          <h2 className='text-base font-semibold'>{formatText(content.dayEntries.entriesTitle, { day: format(selectedDate, 'EEEE') })}</h2>
          {hasEntries && !isFutureDay ? <CreateTrackerDialog defaultDate={selectedKey} /> : null}
        </div>

        {dayLeave ? <LeaveBanner leaveType={dayLeave} /> : null}

        {isLoading ? <ListSkeleton rows={2} /> : null}
        {!isLoading && error ? <ErrorState error={error} onRetry={onRetry} /> : null}
        {isReady && !hasEntries ? (
          isFutureDay ? (
            <EmptyState icon={ClockIcon} title={content.dayEntries.futureTitle} description={content.dayEntries.futureDescription} />
          ) : (
            <EmptyState
              icon={ClockIcon}
              title={content.dayEntries.emptyTitle}
              description={content.dayEntries.emptyDescription}
              action={<CreateTrackerDialog defaultDate={selectedKey} triggerSize='lg' />}
            />
          )
        ) : null}
        {hasEntries ? (
          <ul className='flex flex-col gap-3'>
            {dayEntries.map((tracker) => (
              <TrackerEntryRow
                key={tracker.id}
                tracker={tracker}
                projectName={projectNames.get(tracker.projectId) ?? content.fallbackProjectName}
                now={now}
                hasActiveTimer={Boolean(activeTracker)}
                isPlayPending={restartTracker.isPending}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPlay={handlePlay}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {hasEntries ? (
        <div className='flex items-baseline justify-between gap-3 border-t pt-4'>
          <span className='text-muted-foreground text-sm'>{content.dayEntries.total}</span>
          <span className='text-xl font-semibold tabular-nums'>{formatClock(dayMinutes)}</span>
        </div>
      ) : null}

      {pendingAction?.type === 'edit' ? (
        <EditTrackerDialog
          key={pendingAction.openedAt}
          tracker={pendingAction.tracker}
          open={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
        />
      ) : null}

      {pendingAction?.type === 'delete' ? (
        <ConfirmDialog
          open={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          title={content.dayEntries.deleteDialog.title}
          description={formatText(content.dayEntries.deleteDialog.description, {
            duration: formatDuration(pendingAction.tracker.durationMinutes),
            project: projectNames.get(pendingAction.tracker.projectId) ?? content.dayEntries.deleteDialog.fallbackProject
          })}
          confirmLabel={content.dayEntries.deleteDialog.confirmButton}
          isDestructive
          isBusy={deleteTracker.isPending}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </section>
  );
}

function DayNavigator({ selectedDate, now, onSelectDate }: DayNavigatorProps) {
  const isSelectedToday = isSameDay(selectedDate, now);
  const canGoForward = isAfter(startOfDay(now), startOfDay(selectedDate));

  function handlePreviousClick() {
    onSelectDate(addDays(selectedDate, -1));
  }

  function handleNextClick() {
    onSelectDate(addDays(selectedDate, 1));
  }

  function handleTodayClick() {
    onSelectDate(now);
  }

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='icon' aria-label={content.dayEntries.previousDay} onClick={handlePreviousClick}>
          <ChevronLeftIcon />
        </Button>
        <Button variant='outline' size='icon' aria-label={content.dayEntries.nextDay} disabled={!canGoForward} onClick={handleNextClick}>
          <ChevronRightIcon />
        </Button>
      </div>
      <h2 className='text-xl font-semibold tracking-tight sm:text-2xl'>{format(selectedDate, 'EEE, d MMM')}</h2>
      {isSelectedToday ? (
        <span className='text-deep-teal dark:text-electric-green text-sm font-medium'>{content.dayEntries.today}</span>
      ) : (
        <Button className='ml-auto' onClick={handleTodayClick}>
          {content.dayEntries.goToToday}
        </Button>
      )}
    </div>
  );
}

function WeekStrip({ selectedDate, now, minutesByDate, leaveByDate, isLoading, hasError, onSelectDate }: WeekStripProps) {
  return (
    <div className='-mx-1 overflow-x-auto px-1'>
      <div className='grid min-w-[30rem] grid-cols-7 gap-1.5'>
        {getWeekDays(selectedDate).map((day) => {
          const key = toDateKey(day);

          return (
            <WeekDayButton
              key={key}
              day={day}
              minutes={minutesByDate.get(key) ?? 0}
              leaveType={leaveByDate.get(key)}
              isSelected={isSameDay(day, selectedDate)}
              isFuture={isAfter(startOfDay(day), startOfDay(now))}
              isLoading={isLoading}
              hasError={hasError}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeekDayButton({ day, minutes, leaveType, isSelected, isFuture, isLoading, hasError, onSelect }: WeekDayButtonProps) {
  const value = resolveWeekDayValue({ day, minutes, leaveType, isFuture, hasError });
  const label = leaveType
    ? formatText(content.dayEntries.leaveDayLabel, { day: format(day, 'EEEE d MMMM'), leave: content.leave.types[leaveType] })
    : formatText(content.dayEntries.dayLabel, { day: format(day, 'EEEE d MMMM'), total: value });

  function handleClick() {
    onSelect(day);
  }

  return (
    <button
      type='button'
      disabled={isFuture}
      aria-pressed={isSelected}
      aria-label={label}
      data-selected={isSelected}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl px-1 py-3',
        'hover:bg-muted/60 focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
        'data-[selected=true]:bg-muted disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent'
      )}
      onClick={handleClick}
    >
      <span className='text-xs font-semibold tracking-wide uppercase'>{format(day, 'EEE')}</span>
      {isLoading ? (
        <Skeleton className='h-5 w-10' />
      ) : (
        <span
          className={cn(
            'text-sm tabular-nums',
            leaveType && 'text-info font-medium',
            !leaveType && minutes > 0 && 'font-semibold',
            !leaveType && minutes === 0 && 'text-muted-foreground'
          )}
        >
          {value}
        </span>
      )}
    </button>
  );
}

function LeaveBanner({ leaveType }: { leaveType: LeaveType }) {
  return (
    <div className='bg-info/10 text-info flex items-center gap-2 rounded-xl px-4 py-3 text-sm'>
      <PalmtreeIcon className='size-4 shrink-0' />
      {formatText(content.dayEntries.leaveBanner, { leave: content.leave.types[leaveType] })}
    </div>
  );
}

function resolveWeekDayValue({ day, minutes, leaveType, isFuture, hasError }: WeekDayValueInput): string {
  if (leaveType) {
    return content.leave.shortTypes[leaveType];
  }

  if (hasError || isFuture || (isWeekend(day) && minutes === 0)) {
    return EMPTY_VALUE;
  }

  return formatClock(minutes);
}

const EMPTY_VALUE = '—';

type EntryActionType = 'edit' | 'delete';

interface PendingEntryAction {
  type: EntryActionType;
  tracker: Tracker;
  openedAt: number;
}

interface DayEntriesProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  trackers: Tracker[];
  minutesByDate: Map<string, number>;
  leaveByDate: Map<string, LeaveType>;
  now: Date;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

interface DayNavigatorProps {
  selectedDate: Date;
  now: Date;
  onSelectDate: (date: Date) => void;
}

interface WeekStripProps {
  selectedDate: Date;
  now: Date;
  minutesByDate: Map<string, number>;
  leaveByDate: Map<string, LeaveType>;
  isLoading: boolean;
  hasError: boolean;
  onSelectDate: (date: Date) => void;
}

interface WeekDayButtonProps {
  day: Date;
  minutes: number;
  leaveType: LeaveType | undefined;
  isSelected: boolean;
  isFuture: boolean;
  isLoading: boolean;
  hasError: boolean;
  onSelect: (date: Date) => void;
}

interface WeekDayValueInput {
  day: Date;
  minutes: number;
  leaveType: LeaveType | undefined;
  isFuture: boolean;
  hasError: boolean;
}
