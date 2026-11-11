import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProject, updateProjectStatus } from './mutations';
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

  function mockUserProjectsClient(role: string, result = { data: [projectRow], error: null, status: 200 }) {
    const equal = vi.fn().mockResolvedValue(result);
    const select = vi.fn().mockReturnValue({ eq: equal, then: (resolve: (value: typeof result) => unknown) => resolve(result) });
    createBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { user_role: role } }, error: null })
      },
      from: vi.fn().mockReturnValue({ select })
    });
    return { equal };
  }

  it('filters user projects by the authenticated manager id for managers', async () => {
    const { equal } = mockUserProjectsClient('manager');

    const projects = await getUserProjects();

    expect(equal).toHaveBeenCalledWith('manager_id', 'user-1');
    expect(projects).toHaveLength(1);
    expect(projects[0]?.managerId).toBe('user-1');
  });

  it('does not filter user projects by manager id for admins', async () => {
    const { equal } = mockUserProjectsClient('admin');

    const projects = await getUserProjects();

    expect(equal).not.toHaveBeenCalled();
    expect(projects).toHaveLength(1);
  });

  it('leaves worker scoping to RLS instead of manager id', async () => {
    const { equal } = mockUserProjectsClient('worker');

    await getUserProjects();

    expect(equal).not.toHaveBeenCalled();
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

  it('updates only the status of the requested project', async () => {
    const update = vi.fn();
    const equal = vi.fn();
    const single = vi.fn().mockResolvedValue({ data: { ...projectRow, status: 'archived' }, error: null, status: 200 });
    update.mockReturnValue({ eq: equal });
    equal.mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    createBrowserClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) });

    const project = await updateProjectStatus({ projectId: 'project-1', status: 'archived' });

    expect(update).toHaveBeenCalledWith({ status: 'archived' });
    expect(equal).toHaveBeenCalledWith('id', 'project-1');
    expect(project.status).toBe('archived');
  });

  it('preserves the Supabase response status when a status update fails', async () => {
    createBrowserClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Permission denied' }, status: 403 })
            })
          })
        })
      })
    });

    await expect(updateProjectStatus({ projectId: 'project-1', status: 'archived' })).rejects.toEqual({
      message: 'Permission denied',
      statusCode: 403
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
