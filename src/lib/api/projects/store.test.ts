import { describe, expect, it, vi } from 'vitest';

import { createProjectsStore, type ProjectsRepository } from './store';
import type { CreateProjectInput, Project } from './types';

const existingProject: Project = {
  id: 'project-1',
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedAt: '2026-08-13T10:00:00.000Z',
  name: 'Existing project',
  client: 'Soft Bee',
  note: null,
  pictureUrl: null,
  startDate: '2026-08-01',
  endDate: null,
  status: 'active',
  type: 'time_material',
  managerId: null
};

const projectInput: CreateProjectInput = {
  name: 'New project',
  client: 'Acme',
  note: 'Important',
  pictureUrl: null,
  startDate: '2026-09-01',
  endDate: null,
  status: 'active',
  type: 'fixed_price',
  managerId: 'manager-1'
};

const createdProject: Project = {
  ...projectInput,
  id: 'project-2',
  createdAt: '2026-08-13T11:00:00.000Z',
  updatedAt: '2026-08-13T11:00:00.000Z'
};

function createRepository(overrides: Partial<ProjectsRepository> = {}): ProjectsRepository {
  return {
    getProjects: vi.fn().mockResolvedValue([]),
    createProject: vi.fn().mockResolvedValue(createdProject),
    ...overrides
  };
}

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

describe('projects store', () => {
  it('replaces projects with the loaded collection', async () => {
    const repository = createRepository({
      getProjects: vi.fn().mockResolvedValue([existingProject])
    });
    const store = createProjectsStore(repository);

    await store.getState().getProjects();

    expect(store.getState()).toMatchObject({
      projects: [existingProject],
      isLoading: false,
      error: null
    });
  });

  it('appends and returns a newly created project', async () => {
    const repository = createRepository();
    const store = createProjectsStore(repository);
    store.setState({ projects: [existingProject] });

    const result = await store.getState().createProject(projectInput);

    expect(repository.createProject).toHaveBeenCalledWith(projectInput);
    expect(result).toEqual(createdProject);
    expect(store.getState().projects).toEqual([existingProject, createdProject]);
  });

  it('stores a normalized error and preserves projects when loading fails', async () => {
    const repository = createRepository({
      getProjects: vi.fn().mockRejectedValue(new Error('Network unavailable'))
    });
    const store = createProjectsStore(repository);
    store.setState({ projects: [existingProject] });

    await expect(store.getState().getProjects()).rejects.toEqual({
      message: 'Network unavailable',
      statusCode: 500
    });
    expect(store.getState()).toMatchObject({
      projects: [existingProject],
      isLoading: false,
      error: {
        message: 'Network unavailable',
        statusCode: 500
      }
    });
  });

  it('stays loading and ignores a stale load after a concurrent create', async () => {
    const loadRequest = createDeferred<Project[]>();
    const createRequest = createDeferred<Project>();
    const repository = createRepository({
      getProjects: vi.fn().mockReturnValue(loadRequest.promise),
      createProject: vi.fn().mockReturnValue(createRequest.promise)
    });
    const store = createProjectsStore(repository);
    store.setState({ projects: [existingProject] });

    const loadPromise = store.getState().getProjects();
    const createPromise = store.getState().createProject(projectInput);

    createRequest.resolve(createdProject);
    await createPromise;

    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().projects).toEqual([existingProject, createdProject]);

    loadRequest.resolve([existingProject]);
    await loadPromise;

    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().projects).toEqual([existingProject, createdProject]);
  });

  it('does not let an older request error replace a newer success state', async () => {
    const loadRequest = createDeferred<Project[]>();
    const repository = createRepository({
      getProjects: vi.fn().mockReturnValue(loadRequest.promise)
    });
    const store = createProjectsStore(repository);

    const loadPromise = store.getState().getProjects();
    await store.getState().createProject(projectInput);

    loadRequest.reject(new Error('Old request failed'));
    await expect(loadPromise).rejects.toEqual({
      message: 'Old request failed',
      statusCode: 500
    });

    expect(store.getState().error).toBeNull();
    expect(store.getState().projects).toEqual([createdProject]);
  });
});
