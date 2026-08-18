import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectRate } from './mutations';
import { getProjectRates } from './queries';
import type { CreateProjectRateInput } from './types';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

const rateInput: CreateProjectRateInput = {
  projectId: 'project-1',
  userId: 'user-1',
  rate: 42.5
};

describe('project rates requests', () => {
  beforeEach(() => {
    createBrowserClient.mockReset();
  });

  it('preserves the Supabase response status when loading fails', async () => {
    createBrowserClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Forbidden' },
          status: 403
        })
      })
    });

    await expect(getProjectRates()).rejects.toEqual({
      message: 'Forbidden',
      statusCode: 403
    });
  });

  it('preserves the Supabase response status when creation fails', async () => {
    createBrowserClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Rate already exists' },
              status: 409
            })
          })
        })
      })
    });

    await expect(createProjectRate(rateInput)).rejects.toEqual({
      message: 'Rate already exists',
      statusCode: 409
    });
  });
});
