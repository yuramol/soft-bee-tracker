'use client';

import { useTrackers } from '@/lib/api/trackers';
import type { Tracker } from '@/lib/api/trackers';

export function TrackersList() {
  const { data: trackers, isLoading, error } = useTrackers();

  if (isLoading) {
    return <p className='text-muted-foreground text-sm'>Loading trackers…</p>;
  }

  if (error) {
    return (
      <p role='alert' className='text-destructive text-sm'>
        {error.message}
      </p>
    );
  }

  if (!trackers || trackers.length === 0) {
    return <p className='text-muted-foreground text-sm'>No trackers yet. Create one to get started.</p>;
  }

  return (
    <ul className='divide-border divide-y rounded-lg border text-left'>
      {trackers.map((tracker) => (
        <TrackerListItem key={tracker.id} tracker={tracker} />
      ))}
    </ul>
  );
}

function TrackerListItem({ tracker }: { tracker: Tracker }) {
  return (
    <li className='flex flex-col gap-1 px-4 py-3'>
      <span className='font-medium'>{tracker.description?.trim() || 'No description'}</span>
      <span className='text-muted-foreground text-sm'>
        {tracker.date} · {formatDuration(tracker.durationMinutes)} · {formatStatus(tracker.status)}
      </span>
    </li>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatStatus(status: Tracker['status']): string {
  switch (status) {
    case 'new':
      return 'New';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
  }
}
