'use client';

import { format, parseISO } from 'date-fns';
import { CheckIcon, HistoryIcon, Undo2Icon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@components/common/error-state/error-state';
import { ReviewNoteDialog, type ReviewNoteTarget } from '@components/crew/review-note-dialog/review-note-dialog';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import type { CrewMember, CrewViewer } from '@/lib/api/crew';
import {
  useApproveTracker,
  useMemberTrackers,
  useRejectTracker,
  useTrackerReviews,
  useUndoTrackerReview,
  type Tracker,
  type TrackerReview,
  type TrackerReviewNoteInput,
  type TrackerStatus
} from '@/lib/api/trackers';
import content from '../content.json';
import { formatText } from '@/lib/format/format-text';
import { isLiveTrackerActive } from '@/lib/tracker/live-tracker';
import { formatClock } from '@/lib/format/format-duration';
import { canReviewTracker, getFullName, getTrackerReviewRange } from '@/lib/crew/crew';

// one member's time for managers and admins to approve, reject or undo.
// the trackers rls decides which entries come back (managers: their projects only)
export function MemberTimeReview({ member, viewer, projectNames, memberNames }: MemberTimeReviewProps) {
  // recomputed each render so an open profile moves on when the month changes
  const range = getTrackerReviewRange(new Date());
  const { data: trackers, isLoading, error, refetch } = useMemberTrackers({ userId: member.id, from: range.start, to: range.end });
  // one request for the whole list; rls returns history only to managers and admins
  const { data: reviews, error: reviewsError } = useTrackerReviews({ userId: member.id, from: range.start, to: range.end });
  const reviewsByTracker = groupReviewsByTracker(reviews ?? []);
  const [noteTarget, setNoteTarget] = useState<ReviewNoteTarget | null>(null);

  function handleNoteClose() {
    setNoteTarget(null);
  }

  // approve accepts the same options as reject/undo; concurrent still invalidates via onSettled
  const approveTracker = useApproveTracker({ onConcurrentStatusChange: handleNoteClose });
  // reject/undo live here (not only in the dialog) so row actions stay disabled while a note submit is in flight
  const rejectTracker = useRejectTracker({ onSuccess: handleNoteClose, onConcurrentStatusChange: handleNoteClose });
  const undoReview = useUndoTrackerReview({ onSuccess: handleNoteClose, onConcurrentStatusChange: handleNoteClose });
  const isMutating = approveTracker.isPending || rejectTracker.isPending || undoReview.isPending;
  const memberName = getFullName(member);
  const pendingCount = trackers?.filter((tracker) => tracker.status === 'new' && !isLiveTrackerActive(tracker)).length ?? 0;

  function getProjectName(tracker: Tracker): string {
    return projectNames.get(tracker.projectId) ?? content.timeReview.unknownProject;
  }

  function handleRetry() {
    void refetch();
  }

  function handleApprove(tracker: Tracker) {
    approveTracker.mutate(tracker.id);
  }

  function handleReject(tracker: Tracker) {
    setNoteTarget({ tracker, mode: 'reject' });
  }

  function handleUndo(tracker: Tracker) {
    setNoteTarget({ tracker, mode: 'undo' });
  }

  function handleNoteReject(input: TrackerReviewNoteInput) {
    rejectTracker.mutate(input);
  }

  function handleNoteUndo(input: TrackerReviewNoteInput) {
    undoReview.mutate(input);
  }

  return (
    <section aria-labelledby='member-time-review-title' className='bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-8'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <div className='flex flex-col gap-1'>
          <h2 id='member-time-review-title' className='text-lg font-semibold'>
            {content.timeReview.title}
          </h2>
          <p className='text-muted-foreground text-sm'>
            {content.timeReview.period}
            {viewer.role === 'manager' ? ` · ${content.timeReview.onlyYourProjects}` : null}
          </p>
        </div>
        {pendingCount > 0 ? <Badge variant='info'>{formatText(content.timeReview.pendingCount, { count: pendingCount })}</Badge> : null}
      </div>

      {isLoading ? <TimeReviewSkeleton /> : null}

      {error ? <ErrorState error={error} title={content.timeReview.loadErrorTitle} onRetry={handleRetry} /> : null}

      {trackers && trackers.length === 0 ? <p className='text-muted-foreground text-sm'>{content.timeReview.empty}</p> : null}

      {reviewsError ? <p className='text-destructive text-sm'>{content.timeReview.historyError}</p> : null}

      {trackers && trackers.length > 0 ? (
        <ul className='flex flex-col gap-2'>
          {trackers.map((tracker) => (
            <TimeReviewRow
              key={tracker.id}
              tracker={tracker}
              projectName={getProjectName(tracker)}
              reviewerName={tracker.reviewedBy ? (memberNames.get(tracker.reviewedBy) ?? content.timeReview.unknownReviewer) : null}
              canReview={canReviewTracker({ tracker, ownerRole: member.role, viewer })}
              history={reviewsByTracker.get(tracker.id) ?? NO_REVIEWS}
              memberNames={memberNames}
              isBusy={isMutating}
              onApprove={handleApprove}
              onReject={handleReject}
              onUndo={handleUndo}
            />
          ))}
        </ul>
      ) : null}

      <ReviewNoteDialog
        target={noteTarget}
        entryLabel={noteTarget ? formatEntryLabel(noteTarget.tracker, getProjectName(noteTarget.tracker)) : ''}
        memberName={memberName}
        isBusy={rejectTracker.isPending || undoReview.isPending}
        onReject={handleNoteReject}
        onUndo={handleNoteUndo}
        onClose={handleNoteClose}
      />
    </section>
  );
}

function TimeReviewRow({
  tracker,
  projectName,
  reviewerName,
  canReview,
  history,
  memberNames,
  isBusy,
  onApprove,
  onReject,
  onUndo
}: TimeReviewRowProps) {
  const isRunning = isLiveTrackerActive(tracker);
  const entryLabel = formatEntryLabel(tracker, projectName);
  const statusLabel = content.timeReview.status[tracker.status];

  function handleApproveClick() {
    onApprove(tracker);
  }

  function handleRejectClick() {
    onReject(tracker);
  }

  function handleUndoClick() {
    onUndo(tracker);
  }

  return (
    <li className='bg-muted/50 flex flex-col gap-2.5 rounded-xl px-3 py-2.5 sm:px-4'>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1'>
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm font-medium break-words'>{projectName}</span>
          <span className='text-muted-foreground text-xs'>
            {format(parseISO(tracker.date), 'EEE, d MMM')} · {tracker.description?.trim() || content.timeReview.noDescription}
          </span>
        </div>
        <div className='flex shrink-0 items-center gap-3'>
          <span className='font-semibold tabular-nums'>{formatClock(tracker.durationMinutes)}</span>
          {isRunning ? (
            <Badge variant='warning'>{content.timeReview.running}</Badge>
          ) : (
            <Badge variant={STATUS_BADGE_VARIANTS[tracker.status]}>{statusLabel}</Badge>
          )}
        </div>
      </div>

      {reviewerName && tracker.reviewedAt ? (
        <p className='text-muted-foreground text-xs'>
          {formatText(content.timeReview.reviewedBy, {
            status: statusLabel,
            name: reviewerName,
            date: format(parseISO(tracker.reviewedAt), 'd MMM, HH:mm')
          })}
        </p>
      ) : null}

      {tracker.status === 'rejected' && tracker.reviewNote ? (
        <p className='text-sm break-words'>{formatText(content.timeReview.reason, { note: tracker.reviewNote })}</p>
      ) : null}

      {history.length > 0 ? <ReviewHistory reviews={history} memberNames={memberNames} entryLabel={entryLabel} /> : null}

      {canReview ? (
        <div className='flex justify-end gap-2'>
          {tracker.status === 'new' ? (
            <>
              <Button
                variant='outline'
                size='sm'
                disabled={isBusy}
                aria-label={formatText(content.timeReview.rejectLabel, { entry: entryLabel })}
                onClick={handleRejectClick}
              >
                <XIcon data-icon='inline-start' />
                {content.timeReview.reject}
              </Button>
              <Button
                size='sm'
                disabled={isBusy}
                aria-label={formatText(content.timeReview.approveLabel, { entry: entryLabel })}
                onClick={handleApproveClick}
              >
                <CheckIcon data-icon='inline-start' />
                {content.timeReview.approve}
              </Button>
            </>
          ) : (
            <Button
              variant='ghost'
              size='sm'
              disabled={isBusy}
              aria-label={formatText(content.timeReview.undoLabel, { entry: entryLabel })}
              onClick={handleUndoClick}
            >
              <Undo2Icon data-icon='inline-start' />
              {content.timeReview.undo}
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}

function ReviewHistory({ reviews, memberNames, entryLabel }: ReviewHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleToggleClick() {
    setIsOpen((open) => !open);
  }

  return (
    <div className='flex flex-col gap-2'>
      <Button variant='ghost' size='sm' className='w-fit' aria-expanded={isOpen} onClick={handleToggleClick}>
        <HistoryIcon data-icon='inline-start' />
        {isOpen ? content.timeReview.historyHide : formatText(content.timeReview.history, { count: reviews.length })}
      </Button>
      {isOpen ? (
        <ol aria-label={formatText(content.timeReview.historyLabel, { entry: entryLabel })} className='flex flex-col gap-2 border-l pl-3'>
          {reviews.map((review) => (
            <li key={review.id} className='flex flex-col gap-0.5'>
              <span className='text-muted-foreground text-xs'>
                {formatText(content.timeReview.historyItem, {
                  action: content.timeReview.historyActions[review.action],
                  name: review.actorId
                    ? (memberNames.get(review.actorId) ?? content.timeReview.unknownReviewer)
                    : content.timeReview.unknownReviewer,
                  date: format(parseISO(review.createdAt), 'd MMM, HH:mm')
                })}
              </span>
              {review.note ? <span className='text-sm break-words'>{review.note}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function TimeReviewSkeleton() {
  return (
    <div className='flex flex-col gap-2'>
      <Skeleton className='h-16 w-full rounded-xl' />
      <Skeleton className='h-16 w-full rounded-xl' />
      <Skeleton className='h-16 w-full rounded-xl' />
    </div>
  );
}

// reviews arrive newest first and keep that order per entry
function groupReviewsByTracker(reviews: TrackerReview[]): Map<string, TrackerReview[]> {
  const reviewsByTracker = new Map<string, TrackerReview[]>();

  for (const review of reviews) {
    if (!review.trackerId) {
      continue;
    }

    const trackerReviews = reviewsByTracker.get(review.trackerId) ?? [];
    trackerReviews.push(review);
    reviewsByTracker.set(review.trackerId, trackerReviews);
  }

  return reviewsByTracker;
}

function formatEntryLabel(tracker: Tracker, projectName: string): string {
  return `${projectName}, ${format(parseISO(tracker.date), 'd MMM')}, ${formatClock(tracker.durationMinutes)}`;
}

const NO_REVIEWS: TrackerReview[] = [];

const STATUS_BADGE_VARIANTS: Record<TrackerStatus, 'info' | 'success' | 'destructive'> = {
  new: 'info',
  approved: 'success',
  rejected: 'destructive'
};

interface MemberTimeReviewProps {
  member: CrewMember;
  viewer: CrewViewer;
  projectNames: Map<string, string>;
  memberNames: Map<string, string>;
}

interface TimeReviewRowProps {
  tracker: Tracker;
  projectName: string;
  reviewerName: string | null;
  canReview: boolean;
  history: TrackerReview[];
  memberNames: Map<string, string>;
  isBusy: boolean;
  onApprove: (tracker: Tracker) => void;
  onReject: (tracker: Tracker) => void;
  onUndo: (tracker: Tracker) => void;
}

interface ReviewHistoryProps {
  reviews: TrackerReview[];
  memberNames: Map<string, string>;
  entryLabel: string;
}
