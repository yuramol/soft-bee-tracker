export type TrackerLiveStatus = 'finish' | 'pause' | 'start';

export type TrackerStatus = 'approved' | 'new' | 'rejected';

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

export interface ProjectTrackersInput {
  projectId: string;
  from: string;
  to: string;
}
