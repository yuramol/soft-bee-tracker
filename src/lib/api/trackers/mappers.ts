import type { CreateTrackerInput, Tracker } from '@/lib/api/trackers/types';
import type { Database } from '@/types';

type TrackerRow = Database['public']['Tables']['trackers']['Row'];
type InputTrackerRow = Database['public']['Tables']['trackers']['Insert'];

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
    transactionId: row.transaction_id
  };
}

export function mapTrackersRowsToTrackers(rows: TrackerRow[]): Tracker[] {
  return rows.map(mapTrackerRowToTracker);
}

export function mapTrackerToTrackerRow(tracker: CreateTrackerInput): InputTrackerRow {
  return {
    date: tracker.date,
    description: tracker.description,
    duration_minutes: tracker.durationMinutes,
    is_live: tracker.isLive,
    live_duration_minutes: tracker.liveDurationMinutes,
    live_status: tracker.liveStatus,
    status: tracker.status,
    start_live_date: tracker.startLiveDate,
    project_id: tracker.projectId,
    user_id: tracker.userId,
    transaction_id: tracker.transactionId
  };
}
