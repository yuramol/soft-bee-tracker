import { describe, expect, it, vi } from 'vitest';

import { createCreateProjectStore, type CreateProjectRepository } from './create-project.store';
import type { CreateProjectInput, Project } from './types';

const projectInput: CreateProjectInput = {
  name: 'New project',
  client: 'Acme',
  note: null,
  pictureUrl: null,
  startDate: null,
  endDate: null,
  type: 'fixed_price'
};

const createdProject: Project = {
  ...projectInput,
  id: 'project-2',
  createdAt: '2026-08-20T11:00:00.000Z',
  updatedAt: '2026-08-20T11:00:00.000Z',
  status: 'active',
  managerId: 'user-1'
};

function createRepository(overrides: Partial<CreateProjectRepository> = {}): CreateProjectRepository {
  return {
    createProject: vi.fn().mockResolvedValue(createdProject),
    ...overrides
  };
}

describe('create project store', () => {
  it('creates a project and publishes it to the collection owner', async () => {
    const onCreated = vi.fn();
    const repository = createRepository();
    const store = createCreateProjectStore(repository, onCreated);

    const result = await store.getState().createProject(projectInput);

    expect(repository.createProject).toHaveBeenCalledWith(projectInput);
    expect(onCreated).toHaveBeenCalledWith(createdProject);
    expect(result).toEqual(createdProject);
    expect(store.getState()).toMatchObject({ isCreating: false, createError: null });
  });

  it('keeps creation errors independent from project loading state', async () => {
    const store = createCreateProjectStore(
      createRepository({ createProject: vi.fn().mockRejectedValue(new Error('Creation failed')) }),
      vi.fn()
    );

    await expect(store.getState().createProject(projectInput)).rejects.toEqual({
      message: 'Creation failed',
      statusCode: 500
    });
    expect(store.getState()).toMatchObject({
      isCreating: false,
      createError: { message: 'Creation failed', statusCode: 500 }
    });
  });

  it('does not publish a request that completes after reset', async () => {
    let resolveRequest!: (project: Project) => void;
    const request = new Promise<Project>((resolve) => {
      resolveRequest = resolve;
    });
    const onCreated = vi.fn();
    const store = createCreateProjectStore(createRepository({ createProject: vi.fn().mockReturnValue(request) }), onCreated);

    const createPromise = store.getState().createProject(projectInput);
    store.getState().reset();
    resolveRequest(createdProject);
    await createPromise;

    expect(onCreated).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({ isCreating: false, createError: null });
  });
});
