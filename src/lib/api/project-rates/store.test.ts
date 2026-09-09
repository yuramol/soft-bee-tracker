import { describe, expect, it, vi } from 'vitest';

import { createProjectRatesStore, type ProjectRatesRepository } from './store';
import type { CreateProjectRateInput, ProjectRate } from './types';

const existingRate: ProjectRate = {
  projectId: 'project-1',
  userId: 'user-1',
  rate: 35,
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedAt: '2026-08-13T10:00:00.000Z'
};

const rateInput: CreateProjectRateInput = {
  projectId: 'project-1',
  userId: 'user-2',
  rate: 42.5
};

const createdRate: ProjectRate = {
  ...rateInput,
  createdAt: '2026-08-13T11:00:00.000Z',
  updatedAt: '2026-08-13T11:00:00.000Z'
};

function createRepository(overrides: Partial<ProjectRatesRepository> = {}): ProjectRatesRepository {
  return {
    getProjectRates: vi.fn().mockResolvedValue([]),
    createProjectRate: vi.fn().mockResolvedValue(createdRate),
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

describe('project rates store', () => {
  it('replaces project rates with the loaded collection', async () => {
    const repository = createRepository({
      getProjectRates: vi.fn().mockResolvedValue([existingRate])
    });
    const store = createProjectRatesStore(repository);

    await store.getState().getProjectRates();

    expect(store.getState()).toMatchObject({
      projectRates: [existingRate],
      isLoading: false,
      error: null
    });
  });

  it('appends and returns a newly created project rate', async () => {
    const repository = createRepository();
    const store = createProjectRatesStore(repository);
    store.setState({ projectRates: [existingRate] });

    const result = await store.getState().createProjectRate(rateInput);

    expect(repository.createProjectRate).toHaveBeenCalledWith(rateInput);
    expect(result).toEqual(createdRate);
    expect(store.getState().projectRates).toEqual([existingRate, createdRate]);
  });

  it('stores a normalized error and preserves rates when creation fails', async () => {
    const repository = createRepository({
      createProjectRate: vi.fn().mockRejectedValue({ message: 'Rate already exists', statusCode: 409 })
    });
    const store = createProjectRatesStore(repository);
    store.setState({ projectRates: [existingRate] });

    await expect(store.getState().createProjectRate(rateInput)).rejects.toEqual({
      message: 'Rate already exists',
      statusCode: 409
    });
    expect(store.getState()).toMatchObject({
      projectRates: [existingRate],
      isLoading: false,
      error: {
        message: 'Rate already exists',
        statusCode: 409
      }
    });
  });

  it('stays loading and ignores a stale load after a concurrent create', async () => {
    const loadRequest = createDeferred<ProjectRate[]>();
    const createRequest = createDeferred<ProjectRate>();
    const repository = createRepository({
      getProjectRates: vi.fn().mockReturnValue(loadRequest.promise),
      createProjectRate: vi.fn().mockReturnValue(createRequest.promise)
    });
    const store = createProjectRatesStore(repository);
    store.setState({ projectRates: [existingRate] });

    const loadPromise = store.getState().getProjectRates();
    const createPromise = store.getState().createProjectRate(rateInput);

    createRequest.resolve(createdRate);
    await createPromise;

    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().projectRates).toEqual([existingRate, createdRate]);

    loadRequest.resolve([existingRate]);
    await loadPromise;

    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().projectRates).toEqual([existingRate, createdRate]);
  });

  it('does not let an older request error replace a newer success state', async () => {
    const loadRequest = createDeferred<ProjectRate[]>();
    const repository = createRepository({
      getProjectRates: vi.fn().mockReturnValue(loadRequest.promise)
    });
    const store = createProjectRatesStore(repository);

    const loadPromise = store.getState().getProjectRates();
    await store.getState().createProjectRate(rateInput);

    loadRequest.reject(new Error('Old request failed'));
    await expect(loadPromise).rejects.toEqual({
      message: 'Old request failed',
      statusCode: 500
    });

    expect(store.getState().error).toBeNull();
    expect(store.getState().projectRates).toEqual([createdRate]);
  });
});
