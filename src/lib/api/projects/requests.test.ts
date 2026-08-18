import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProject } from './mutations';
import { getProjects } from './queries';
import type { CreateProjectInput } from './types';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

const projectInput: CreateProjectInput = {
  name: 'Duplicate project',
  client: 'Acme',
  note: null,
  pictureUrl: null,
  startDate: null,
  endDate: null,
  status: 'active',
  type: 'fixed_price',
  managerId: null
};

describe('projects requests', () => {
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

    await expect(getProjects()).rejects.toEqual({
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
              error: { message: 'Project already exists' },
              status: 409
            })
          })
        })
      })
    });

    await expect(createProject(projectInput)).rejects.toEqual({
      message: 'Project already exists',
      statusCode: 409
    });
  });
});
