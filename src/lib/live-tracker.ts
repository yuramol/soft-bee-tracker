import type { Tracker } from '@/lib/api/trackers/types';
import { MAX_DURATION_MINUTES } from '@/lib/format-duration';

export function isLiveTrackerActive(tracker: Pick<Tracker, 'isLive' | 'liveStatus'>): boolean {
  return tracker.isLive && (tracker.liveStatus === 'start' || tracker.liveStatus === 'pause');
}

export function getLiveElapsedSeconds(tracker: Pick<Tracker, 'liveDurationMinutes' | 'liveStatus' | 'startLiveDate'>, now: Date): number {
  const bankedSeconds = tracker.liveDurationMinutes * 60;

  if (tracker.liveStatus !== 'start' || !tracker.startLiveDate) {
    return bankedSeconds;
  }

  const runSeconds = Math.floor((now.getTime() - new Date(tracker.startLiveDate).getTime()) / 1000);

  return bankedSeconds + Math.max(0, runSeconds);
}

export function getLiveElapsedMinutes(tracker: Pick<Tracker, 'liveDurationMinutes' | 'liveStatus' | 'startLiveDate'>, now: Date): number {
  return Math.round(getLiveElapsedSeconds(tracker, now) / 60);
}

export function getLiveWholeMinutes(tracker: Pick<Tracker, 'liveDurationMinutes' | 'liveStatus' | 'startLiveDate'>, now: Date): number {
  return Math.floor(getLiveElapsedSeconds(tracker, now) / 60);
}

export function getMsUntilNextLiveMinute(startLiveDate: string, now: Date): number {
  const elapsedMs = now.getTime() - new Date(startLiveDate).getTime();

  if (elapsedMs < 0) {
    return -elapsedMs + MINUTE_MS;
  }

  return MINUTE_MS - (elapsedMs % MINUTE_MS);
}

const MINUTE_MS = 60_000;

export function formatStopwatch(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function formatTimerLabel(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

export function clampFinishedMinutes(minutes: number): number {
  return Math.min(MAX_DURATION_MINUTES, Math.max(1, minutes));
}
