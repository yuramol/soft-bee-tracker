import { format } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  discardLiveTracker,
  finishLiveTracker,
  pauseLiveTracker,
  restartLiveTracker,
  resumeLiveTracker,
  startLiveTracker
} from './mutations';
import type { Tracker } from './types';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

const NOW = new Date('2026-11-05T12:00:00.000Z');

const trackerRow = {
  id: 'tracker-1',
  created_at: '2026-11-05T11:00:00.000Z',
  updated_at: '2026-11-05T11:00:00.000Z',
  date: '2026-11-05',
  description: 'Work',
  duration_minutes: 0,
  is_live: true,
  live_duration_minutes: 0,
  live_status: 'start' as const,
  status: 'new' as const,
  start_live_date: '2026-11-05T11:00:00.000Z',
  project_id: 'project-1',
  user_id: 'user-1',
  transaction_id: null
};

const runningTracker: Tracker = {
  id: 'tracker-1',
  createdAt: '2026-11-05T11:00:00.000Z',
  updatedAt: '2026-11-05T11:00:00.000Z',
  date: '2026-11-05',
  description: 'Work',
  durationMinutes: 0,
  isLive: true,
  liveDurationMinutes: 10,
  liveStatus: 'start',
  status: 'new',
  startLiveDate: '2026-11-05T11:58:30.000Z',
  projectId: 'project-1',
  userId: 'user-1',
  transactionId: null
};

interface QueryResult {
  data: typeof trackerRow | null;
  error: { message: string } | null;
  status: number;
}

function mockTrackersTable(result: QueryResult = { data: trackerRow, error: null, status: 200 }) {
  const builder = {
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
  };
  const from = vi.fn(() => builder);
  createBrowserClient.mockReturnValue({ from });

  return { builder, from };
}

describe('live tracker mutations', () => {
  beforeEach(() => {
    createBrowserClient.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a live tracker dated today with no banked time', async () => {
    const { builder, from } = mockTrackersTable();

    const tracker = await startLiveTracker({ projectId: 'project-1', description: 'Work' });

    expect(from).toHaveBeenCalledWith('trackers');
    expect(builder.insert).toHaveBeenCalledWith({
      date: format(NOW, 'yyyy-MM-dd'),
      description: 'Work',
      duration_minutes: 0,
      project_id: 'project-1',
      is_live: true,
      live_status: 'start',
      live_duration_minutes: 0,
      start_live_date: NOW.toISOString()
    });
    expect(tracker.id).toBe('tracker-1');
  });

  it('banks floored minutes on pause and only touches an active timer', async () => {
    const { builder } = mockTrackersTable();

    await pauseLiveTracker(runningTracker);

    expect(builder.update).toHaveBeenCalledWith({ live_status: 'pause', live_duration_minutes: 11, start_live_date: null });
    expect(builder.eq).toHaveBeenCalledWith('id', 'tracker-1');
    expect(builder.in).toHaveBeenCalledWith('live_status', ['start', 'pause']);
  });

  it('does not credit a sub-minute run on pause', async () => {
    const { builder } = mockTrackersTable();

    await pauseLiveTracker({ ...runningTracker, liveDurationMinutes: 5, startLiveDate: '2026-11-05T11:59:31.000Z' });

    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ live_duration_minutes: 5 }));
  });

  it('resumes from now without changing banked minutes', async () => {
    const { builder } = mockTrackersTable();

    await resumeLiveTracker({ ...runningTracker, liveStatus: 'pause', startLiveDate: null });

    expect(builder.update).toHaveBeenCalledWith({ live_status: 'start', start_live_date: NOW.toISOString() });
    expect(builder.in).toHaveBeenCalledWith('live_status', ['start', 'pause']);
  });

  it('finishes with the entry the user confirmed', async () => {
    const { builder } = mockTrackersTable();

    await finishLiveTracker({
      tracker: runningTracker,
      entry: { projectId: 'project-2', date: '2026-11-04', description: null, durationMinutes: 45 }
    });

    expect(builder.update).toHaveBeenCalledWith({
      live_status: 'finish',
      live_duration_minutes: 12,
      start_live_date: null,
      project_id: 'project-2',
      date: '2026-11-04',
      description: null,
      duration_minutes: 45
    });
    expect(builder.in).toHaveBeenCalledWith('live_status', ['start', 'pause']);
  });

  it('deletes a brand-new timer on discard', async () => {
    const { builder } = mockTrackersTable({ data: null, error: null, status: 204 });

    const result = await discardLiveTracker(runningTracker);

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.update).not.toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'tracker-1');
    expect(builder.in).toHaveBeenCalledWith('live_status', ['start', 'pause']);
    expect(result).toBe(runningTracker);
  });

  it('restores the saved duration when discarding a continued entry', async () => {
    const { builder } = mockTrackersTable();

    await discardLiveTracker({ ...runningTracker, durationMinutes: 30, liveDurationMinutes: 30 });

    expect(builder.delete).not.toHaveBeenCalled();
    expect(builder.update).toHaveBeenCalledWith({ live_status: 'finish', live_duration_minutes: 30, start_live_date: null });
  });

  it('continues a saved entry from its existing duration', async () => {
    const { builder } = mockTrackersTable();

    await restartLiveTracker({ ...runningTracker, isLive: false, liveStatus: null, durationMinutes: 40, startLiveDate: null });

    expect(builder.update).toHaveBeenCalledWith({
      is_live: true,
      live_status: 'start',
      live_duration_minutes: 40,
      start_live_date: NOW.toISOString()
    });
    expect(builder.in).not.toHaveBeenCalled();
  });

  it('normalizes a failed update to an ApiError with the response status', async () => {
    mockTrackersTable({ data: null, error: { message: 'Permission denied' }, status: 403 });

    await expect(pauseLiveTracker(runningTracker)).rejects.toEqual({ message: 'Permission denied', statusCode: 403 });
  });

  it('normalizes a failed discard to an ApiError with the response status', async () => {
    mockTrackersTable({ data: null, error: { message: 'Permission denied' }, status: 403 });

    await expect(discardLiveTracker(runningTracker)).rejects.toEqual({ message: 'Permission denied', statusCode: 403 });
  });
});
