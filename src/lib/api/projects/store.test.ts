import { describe, expect, it, vi } from 'vitest';

import { createProjectsStore, type ProjectsRepository } from './store';
import type { Project } from './types';

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
  managerId: 'user-1'
};

function createRepository(overrides: Partial<ProjectsRepository> = {}): ProjectsRepository {
  return {
    getProjects: vi.fn().mockResolvedValue([]),
    getUserProjects: vi.fn().mockResolvedValue([]),
    ...overrides
  };
}

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

describe('projects store', () => {
  it('loads the authenticated user project collection', async () => {
    const repository = createRepository({
      getUserProjects: vi.fn().mockResolvedValue([existingProject])
    });
    const store = createProjectsStore(repository);

    await store.getState().getUserProjects();

    expect(store.getState()).toMatchObject({
      userProjects: [existingProject],
      isLoading: false,
      error: null
    });
  });

  it('adds a user project once', () => {
    const store = createProjectsStore(createRepository());

    store.getState().addUserProject(existingProject);
    store.getState().addUserProject(existingProject);

    expect(store.getState().userProjects).toEqual([existingProject]);
  });

  it('preserves a created project when an older user-project load finishes', async () => {
    const loadRequest = createDeferred<Project[]>();
    const store = createProjectsStore(
      createRepository({
        getUserProjects: vi.fn().mockReturnValue(loadRequest.promise)
      })
    );

    const loadPromise = store.getState().getUserProjects();
    store.getState().addUserProject(existingProject);
    loadRequest.resolve([]);
    await loadPromise;

    expect(store.getState().userProjects).toEqual([existingProject]);
    expect(store.getState().isLoading).toBe(false);
  });

  it('stores a normalized load error without clearing projects', async () => {
    const store = createProjectsStore(
      createRepository({
        getUserProjects: vi.fn().mockRejectedValue(new Error('Network unavailable'))
      })
    );
    store.setState({ userProjects: [existingProject] });

    await expect(store.getState().getUserProjects()).rejects.toEqual({
      message: 'Network unavailable',
      statusCode: 500
    });
    expect(store.getState()).toMatchObject({
      userProjects: [existingProject],
      isLoading: false,
      error: { message: 'Network unavailable', statusCode: 500 }
    });
  });
});
