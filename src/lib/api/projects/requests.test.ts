import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProject } from './mutations';
import { getProjects, getUserProjects } from './queries';
import type { CreateProjectInput } from './types';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

const projectInput: CreateProjectInput = {
  name: 'New project',
  client: 'Acme',
  note: null,
  pictureUrl: null,
  startDate: null,
  endDate: null,
  type: 'fixed_price'
};

const projectRow = {
  id: 'project-1',
  created_at: '2026-08-20T10:00:00.000Z',
  updated_at: '2026-08-20T10:00:00.000Z',
  name: projectInput.name,
  client: projectInput.client,
  note: null,
  picture_url: null,
  start_date: null,
  end_date: null,
  status: 'active' as const,
  type: projectInput.type,
  manager_id: 'user-1'
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

  it('filters user projects by the authenticated manager id', async () => {
    const equal = vi.fn().mockResolvedValue({ data: [projectRow], error: null, status: 200 });
    createBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: equal })
      })
    });

    const projects = await getUserProjects();

    expect(equal).toHaveBeenCalledWith('manager_id', 'user-1');
    expect(projects).toHaveLength(1);
    expect(projects[0]?.managerId).toBe('user-1');
  });

  it('creates an active project managed by the authenticated user', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: projectRow, error: null, status: 201 })
      })
    });
    createBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      },
      from: vi.fn().mockReturnValue({ insert })
    });

    const project = await createProject(projectInput);

    expect(insert).toHaveBeenCalledWith({
      name: 'New project',
      client: 'Acme',
      note: null,
      picture_url: null,
      start_date: null,
      end_date: null,
      type: 'fixed_price',
      manager_id: 'user-1'
    });
    expect(project.status).toBe('active');
    expect(project.managerId).toBe('user-1');
  });

  it('rejects creation when there is no authenticated user', async () => {
    createBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      }
    });

    await expect(createProject(projectInput)).rejects.toEqual({
      message: 'You must be signed in to create a project',
      statusCode: 401
    });
  });

  it('preserves the Supabase response status when creation fails', async () => {
    createBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      },
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
