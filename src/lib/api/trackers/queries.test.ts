import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTrackerReviews } from './queries';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

interface QueryResult {
  data: unknown[] | null;
  error: { message: string } | null;
  status: number;
}

function mockReviewsTable(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result))
  };
  const from = vi.fn(() => builder);
  createBrowserClient.mockReturnValue({ from });

  return { builder, from };
}

describe('getTrackerReviews', () => {
  beforeEach(() => {
    createBrowserClient.mockReset();
  });

  it("loads one member's history in a date range through the trackers join, newest first", async () => {
    const { builder, from } = mockReviewsTable({
      data: [
        {
          id: 'review-1',
          created_at: '2026-11-18T10:00:00.000Z',
          tracker_id: 'tracker-1',
          action: 'undone',
          actor_id: 'manager-1',
          note: 'Approved the wrong day',
          previous_status: 'approved',
          trackers: { user_id: 'user-1', date: '2026-11-18' }
        }
      ],
      error: null,
      status: 200
    });

    const reviews = await getTrackerReviews({ userId: 'user-1', from: '2026-10-01', to: '2026-11-30' });

    expect(from).toHaveBeenCalledWith('tracker_reviews');
    expect(builder.select).toHaveBeenCalledWith(expect.stringContaining('trackers!inner(user_id, date)'));
    expect(builder.eq).toHaveBeenCalledWith('trackers.user_id', 'user-1');
    expect(builder.gte).toHaveBeenCalledWith('trackers.date', '2026-10-01');
    expect(builder.lte).toHaveBeenCalledWith('trackers.date', '2026-11-30');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(reviews).toEqual([
      {
        id: 'review-1',
        createdAt: '2026-11-18T10:00:00.000Z',
        trackerId: 'tracker-1',
        action: 'undone',
        actorId: 'manager-1',
        note: 'Approved the wrong day',
        previousStatus: 'approved'
      }
    ]);
  });

  it('normalizes a failed request to an ApiError', async () => {
    mockReviewsTable({ data: null, error: { message: 'Permission denied' }, status: 403 });

    await expect(getTrackerReviews({ userId: 'user-1', from: '2026-10-01', to: '2026-11-30' })).rejects.toEqual({
      message: 'Permission denied',
      statusCode: 403
    });
  });
});
