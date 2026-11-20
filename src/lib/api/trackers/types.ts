export type TrackerLiveStatus = 'finish' | 'pause' | 'start';

export type TrackerStatus = 'approved' | 'new' | 'rejected';

export type TrackerReviewAction = 'approved' | 'rejected' | 'undone';

export interface Tracker {
  id: string;
  createdAt: string;
  updatedAt: string;
  date: string;
  description: string | null;
  durationMinutes: number;
  isLive: boolean;
  liveDurationMinutes: number;
  liveStatus: TrackerLiveStatus | null;
  status: TrackerStatus;
  startLiveDate: string | null;
  projectId: string;
  userId: string;
  transactionId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface CreateTrackerInput {
  projectId: string;
  date: string;
  description: string | null;
  durationMinutes: number;
}

export interface StartLiveTrackerInput {
  projectId: string;
  description: string | null;
}

export interface FinishLiveTrackerInput {
  tracker: Tracker;
  entry: CreateTrackerInput;
}

export interface UpdateTrackerInput {
  trackerId: string;
  entry: CreateTrackerInput;
}

// reject and undo both need a reason
export interface TrackerReviewNoteInput {
  trackerId: string;
  note: string;
}

export interface TrackerReview {
  id: string;
  createdAt: string;
  // null once the entry itself was deleted; the history is kept
  trackerId: string | null;
  action: TrackerReviewAction;
  actorId: string | null;
  note: string | null;
  previousStatus: TrackerStatus;
}

export interface MemberTrackersInput {
  userId: string;
  from: string;
  to: string;
}

export interface ProjectTrackersInput {
  projectId: string;
  from: string;
  to: string;
}
