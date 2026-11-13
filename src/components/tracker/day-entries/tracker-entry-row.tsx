'use client';

import { PencilIcon, PlayIcon, Trash2Icon } from 'lucide-react';

import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import type { Tracker, TrackerStatus } from '@/lib/api/trackers';
import { formatClock } from '@/lib/format-duration';
import { isLiveTrackerActive } from '@/lib/live-tracker';
import { getTrackerMinutes } from '@/lib/tracker-days';
import { isEntryDateOpen } from '@/lib/work-time-policy';
import content from '../content.json';

export function TrackerEntryRow({
  tracker,
  projectName,
  now,
  hasActiveTimer,
  isPlayPending,
  onEdit,
  onDelete,
  onPlay
}: TrackerEntryRowProps) {
  const isActiveTimer = isLiveTrackerActive(tracker);
  const isClosed = !isEntryDateOpen(tracker.date, now);
  const isEditable = tracker.status === 'new' && !isActiveTimer && !isClosed;

  function handleEditClick() {
    onEdit(tracker);
  }

  function handleDeleteClick() {
    onDelete(tracker);
  }

  function handlePlayClick() {
    onPlay(tracker);
  }

  return (
    <li className='bg-background hover:border-foreground/20 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-4 transition-colors sm:flex-nowrap sm:px-5'>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='truncate font-semibold'>{projectName}</span>
        <span className='text-muted-foreground truncate text-sm'>{tracker.description?.trim() || content.entryRow.noDescription}</span>
      </div>

      <span className='shrink-0 text-xl font-semibold tabular-nums'>{formatClock(getTrackerMinutes(tracker, now))}</span>

      <div className='flex shrink-0 items-center gap-1 max-sm:w-full max-sm:justify-end'>
        {isActiveTimer ? (
          <EntryBadge
            label={tracker.liveStatus === 'start' ? content.entryRow.live : content.entryRow.paused}
            variant={tracker.liveStatus === 'start' ? 'brand' : 'warning'}
          />
        ) : null}
        {!isActiveTimer && !isEditable ? (
          <EntryBadge {...(isClosed && tracker.status === 'new' ? CLOSED_BADGE : LOCKED_STATUS_BADGES[tracker.status])} />
        ) : null}
        {isEditable ? (
          <>
            <Button
              variant='ghost'
              size='icon'
              aria-label={content.entryRow.continueLabel}
              title={hasActiveTimer ? content.entryRow.stopRunningFirst : content.entryRow.continue}
              disabled={hasActiveTimer || isPlayPending}
              className='text-deep-teal dark:text-electric-green'
              onClick={handlePlayClick}
            >
              <PlayIcon className='translate-x-px fill-current' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              aria-label={content.entryRow.deleteLabel}
              title={content.entryRow.delete}
              className='text-destructive hover:text-destructive'
              onClick={handleDeleteClick}
            >
              <Trash2Icon />
            </Button>
            <Button variant='outline' aria-label={content.entryRow.editLabel} className='ml-1' onClick={handleEditClick}>
              <PencilIcon data-icon='inline-start' />
              {content.entryRow.edit}
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function EntryBadge({ label, variant }: EntryBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>;
}

const CLOSED_BADGE: EntryBadgeProps = { label: content.entryRow.status.closed, variant: 'info' };

const LOCKED_STATUS_BADGES: Record<TrackerStatus, EntryBadgeProps> = {
  new: { label: content.entryRow.status.new, variant: 'info' },
  approved: { label: content.entryRow.status.approved, variant: 'success' },
  rejected: { label: content.entryRow.status.rejected, variant: 'destructive' }
};

interface EntryBadgeProps {
  label: string;
  variant: 'brand' | 'warning' | 'info' | 'success' | 'destructive';
}

interface TrackerEntryRowProps {
  tracker: Tracker;
  projectName: string;
  now: Date;
  hasActiveTimer: boolean;
  isPlayPending: boolean;
  onEdit: (tracker: Tracker) => void;
  onDelete: (tracker: Tracker) => void;
  onPlay: (tracker: Tracker) => void;
}
