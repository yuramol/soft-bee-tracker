export function formatDuration(minutes: number): string {
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

export function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / total) * 100));
}

export const MAX_DURATION_MINUTES = 24 * 60;

export function formatHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

export function parseHoursMinutes(value: string): number {
  const match = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(value.trim());

  if (!match) {
    return Number.NaN;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const total = hours * 60 + minutes;

  if (minutes >= 60 || total <= 0 || total > MAX_DURATION_MINUTES) {
    return Number.NaN;
  }

  return total;
}

export function formatClock(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}
