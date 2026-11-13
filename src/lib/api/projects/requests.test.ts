import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addProjectMember, createProject, removeProjectMember, updateProject, updateProjectStatus } from './mutations';
import { getProjectRecords, getProjects, getUserProjects } from './queries';
import type { CreateProjectInput } from './types';

const createBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient }));

const projectInput: CreateProjectInput = {
  name: ' New project ',
  client: ' Acme ',
  description: ' ',
  managerId: 'manager-2',
  managerIds: ['manager-3', 'manager-2']
};

const projectRow = {
  id: 'project-1',
  created_at: '2026-08-20T10:00:00.000Z',
  updated_at: '2026-08-20T10:00:00.000Z',
  name: 'New project',
  client: 'Acme',
  note: null,
  picture_url: null,
  start_date: null,
  end_date: null,
  status: 'active' as const,
  type: 'time_material' as const,
  manager_id: 'manager-2',
  links: [{ label: 'Repo', url: 'https://github.com/softbee/new' }, { label: 42 }]
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
    const equal = vi.fn().mockResolvedValue({ data: [{ ...projectRow, manager_id: 'user-1' }], error: null, status: 200 });
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

  it('creates the project with its responsible person and extra managers in one call', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'project-1', error: null, status: 200 });
    createBrowserClient.mockReturnValue({ rpc });

    const created = await createProject(projectInput);

    expect(rpc).toHaveBeenCalledWith('create_project', {
      project_name: 'New project',
      responsible_id: 'manager-2',
      project_client: 'Acme',
      manager_ids: ['manager-3']
    });
    expect(created).toEqual({ id: 'project-1', name: 'New project' });
  });

  it('sends the description as the project note when there is one', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'project-1', error: null, status: 200 });
    createBrowserClient.mockReturnValue({ rpc });

    await createProject({ ...projectInput, description: ' Scope ' });

    expect(rpc).toHaveBeenCalledWith('create_project', expect.objectContaining({ project_note: 'Scope' }));
  });

  it('saves edits only against the version the form was opened with', async () => {
    const eqVersion = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { ...projectRow, note: 'Scope' }, error: null, status: 200 })
      })
    });
    const eqId = vi.fn().mockReturnValue({ eq: eqVersion });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    createBrowserClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) });

    const result = await updateProject({
      projectId: 'project-1',
      changes: { client: ' Globex ', description: ' Scope ', links: [{ label: ' Repo ', url: ' https://github.com/softbee/new ' }] },
      baseUpdatedAt: '2026-08-20T10:00:00.000Z'
    });

    expect(update).toHaveBeenCalledWith({
      client: 'Globex',
      note: 'Scope',
      links: [{ label: 'Repo', url: 'https://github.com/softbee/new' }]
    });
    expect(eqId).toHaveBeenCalledWith('id', 'project-1');
    expect(eqVersion).toHaveBeenCalledWith('updated_at', '2026-08-20T10:00:00.000Z');
    expect(result.status).toBe('saved');
  });

  it('reports a conflict when the project changed in the meantime', async () => {
    createBrowserClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null, status: 200 })
              })
            })
          })
        })
      })
    });

    await expect(updateProject({ projectId: 'project-1', changes: { name: 'X' }, baseUpdatedAt: 'stale' })).resolves.toEqual({
      status: 'conflict'
    });
  });

  it('adds and removes members through project_rates', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null, status: 201 });
    const eqUser = vi.fn().mockResolvedValue({ error: null, status: 204 });
    const eqProject = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ insert, delete: vi.fn().mockReturnValue({ eq: eqProject }) });
    createBrowserClient.mockReturnValue({ from });

    await addProjectMember({ projectId: 'project-1', userId: 'user-2' });
    await removeProjectMember({ projectId: 'project-1', userId: 'user-2' });

    expect(from).toHaveBeenCalledWith('project_rates');
    expect(insert).toHaveBeenCalledWith({ project_id: 'project-1', user_id: 'user-2' });
    expect(eqProject).toHaveBeenCalledWith('project_id', 'project-1');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-2');
  });

  it('combines projects with their members into page records', async () => {
    createBrowserClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ ...projectRow, note: 'Scope' }], error: null, status: 200 })
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { project_id: 'project-1', user_id: 'manager-2' },
          { project_id: 'project-1', user_id: 'user-3' },
          { project_id: 'project-9', user_id: 'user-3' }
        ],
        error: null,
        status: 200
      })
    });

    await expect(getProjectRecords()).resolves.toEqual([
      {
        id: 'project-1',
        name: 'New project',
        client: 'Acme',
        description: 'Scope',
        managerId: 'manager-2',
        status: 'active',
        memberIds: ['manager-2', 'user-3'],
        links: [{ label: 'Repo', url: 'https://github.com/softbee/new' }],
        updatedAt: '2026-08-20T10:00:00.000Z'
      }
    ]);
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
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Project already exists' }, status: 409 })
    });

    await expect(createProject(projectInput)).rejects.toEqual({
      message: 'Project already exists',
      statusCode: 409
    });
  });
});
