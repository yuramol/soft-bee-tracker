import type { CreateTrackerInput, StartLiveTrackerInput, Tracker, TrackerReview } from '@/lib/api/trackers/types';
import type { Database } from '@/types';
import type { ApiError } from '@/types/api-error';
import content from './content.json';

export const TRACKER_STATUS_CHANGED_CODE = 'tracker_review.status_changed';

type TrackerRow = Database['public']['Tables']['trackers']['Row'];
type InputTrackerRow = Database['public']['Tables']['trackers']['Insert'];
export type UpdateTrackerRow = Database['public']['Tables']['trackers']['Update'];
type TrackerReviewRow = Database['public']['Tables']['tracker_reviews']['Row'];

export const TRACKER_COLUMNS =
  'id, created_at, updated_at, date, description, duration_minutes, is_live, live_duration_minutes, live_status, status, start_live_date, project_id, user_id, transaction_id, reviewed_by, reviewed_at, review_note';

export function mapTrackerRowToTracker(row: TrackerRow): Tracker {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    date: row.date,
    description: row.description,
    durationMinutes: row.duration_minutes,
    isLive: row.is_live,
    liveDurationMinutes: row.live_duration_minutes,
    liveStatus: row.live_status,
    status: row.status,
    startLiveDate: row.start_live_date,
    projectId: row.project_id,
    userId: row.user_id,
    transactionId: row.transaction_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note
  };
}

export const TRACKER_REVIEW_COLUMNS = 'id, created_at, tracker_id, action, actor_id, note, previous_status';

export function mapTrackerReviewRowToTrackerReview(row: TrackerReviewRow): TrackerReview {
  return {
    id: row.id,
    createdAt: row.created_at,
    trackerId: row.tracker_id,
    action: row.action,
    actorId: row.actor_id,
    note: row.note,
    previousStatus: row.previous_status
  };
}

export function mapTrackersRowsToTrackers(rows: TrackerRow[]): Tracker[] {
  return rows.map(mapTrackerRowToTracker);
}

export function mapCreateTrackerInputToRow(input: CreateTrackerInput): InputTrackerRow {
  return {
    date: input.date,
    description: input.description,
    duration_minutes: input.durationMinutes,
    project_id: input.projectId
  };
}

export function mapStartLiveTrackerInputToRow(input: StartLiveTrackerInput, startedAt: Date, date: string): InputTrackerRow {
  return {
    date,
    description: input.description,
    duration_minutes: 0,
    project_id: input.projectId,
    is_live: true,
    live_status: 'start',
    live_duration_minutes: 0,
    start_live_date: startedAt.toISOString()
  };
}

// hint keys come from private.guard_tracker_review; matching keys (not message text) keeps the
// mapping stable if the database wording changes
export function mapTrackerReviewErrorToApiError(error: TrackerDatabaseError, statusCode: number): ApiError {
  if (error.code === NO_ROWS_ERROR_CODE) {
    // no row matched id + expected status: deleted, already reviewed/changed, or rls hid it
    return {
      message: content.reviewErrors.statusChanged,
      statusCode,
      code: TRACKER_STATUS_CHANGED_CODE
    };
  }

  return {
    message: REVIEW_ERROR_MESSAGES[error.hint ?? ''] ?? content.reviewErrors.unexpected,
    statusCode
  };
}

export function isTrackerStatusChangedError(error: ApiError): boolean {
  return error.code === TRACKER_STATUS_CHANGED_CODE;
}

// any other tracker write (log, edit, timer, delete): a review key gets its message, so a
// locked entry explains itself; other errors keep their database text, which is already
// written for people (for example the closed-month message)
export function mapTrackerWriteErrorToApiError(error: TrackerDatabaseError, statusCode: number): ApiError {
  return {
    message: (error.hint ? REVIEW_ERROR_MESSAGES[error.hint] : undefined) ?? error.message,
    statusCode
  };
}

const NO_ROWS_ERROR_CODE = 'PGRST116';

const REVIEW_ERROR_MESSAGES: Record<string, string> = {
  'tracker_review.not_reviewer': content.reviewErrors.notAllowed,
  'tracker_review.own_entry': content.reviewErrors.ownEntry,
  'tracker_review.admin_entry': content.reviewErrors.adminEntry,
  'tracker_review.invalid_transition': content.reviewErrors.alreadyReviewed,
  'tracker_review.entry_changed': content.reviewErrors.unexpected,
  'tracker_review.timer_running': content.reviewErrors.timerRunning,
  'tracker_review.reason_required': content.reviewErrors.reasonRequired,
  'tracker_review.undo_reason_required': content.reviewErrors.undoReasonRequired,
  'tracker_review.reason_too_long': content.reviewErrors.reasonTooLong,
  'tracker_review.reviewed_locked': content.reviewErrors.reviewedLocked,
  'tracker_review.insert_reviewed': content.reviewErrors.insertReviewed
};

export interface TrackerDatabaseError {
  code: string;
  message: string;
  hint?: string | null;
}
