import { describe, expect, it, vi } from 'vitest';

import { createProfileStore, type ProfileRepository } from './profile.store';
import type { UpdateProfileRequest, UserProfile } from './types';

const savedProfile: UserProfile = {
  id: 'user-1',
  username: 'johndoe',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: null,
  avatarUrl: null,
  role: 'worker',
  dateEmployment: null,
  positions: null,
  salary: null,
  salaryInfo: null,
  typeSalary: null,
  linkedin: null,
  upwork: null,
  isConfirmed: true,
  isBlocked: false
};

const renamedProfile: UserProfile = { ...savedProfile, firstName: 'Johnny' };

const profileRequest: UpdateProfileRequest = {
  username: 'johndoe',
  firstName: 'Johnny',
  lastName: 'Doe',
  phone: null,
  avatarUrl: null,
  linkedin: null,
  upwork: null
};

function createRepository(overrides: Partial<ProfileRepository> = {}): ProfileRepository {
  return {
    getProfile: vi.fn().mockResolvedValue(savedProfile),
    updateProfile: vi.fn().mockResolvedValue(renamedProfile),
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

describe('profile store', () => {
  it('loads the profile into state', async () => {
    const store = createProfileStore(createRepository());

    await store.getState().getProfile();

    expect(store.getState()).toMatchObject({
      profile: savedProfile,
      isLoading: false,
      loadError: null
    });
  });

  it('seeds the profile from the server without a request', () => {
    const repository = createRepository();
    const store = createProfileStore(repository);

    store.getState().setProfile(savedProfile);

    expect(repository.getProfile).not.toHaveBeenCalled();
    expect(store.getState().profile).toEqual(savedProfile);
  });

  it('publishes and returns the saved profile', async () => {
    const repository = createRepository();
    const store = createProfileStore(repository);
    store.getState().setProfile(savedProfile);

    const result = await store.getState().updateProfile(profileRequest);

    expect(repository.updateProfile).toHaveBeenCalledWith(profileRequest);
    expect(result).toEqual(renamedProfile);
    expect(store.getState()).toMatchObject({
      profile: renamedProfile,
      isSaving: false,
      saveError: null
    });
  });

  it('keeps load and save lifecycles independent', async () => {
    const save = createDeferred<UserProfile>();
    const store = createProfileStore(
      createRepository({
        updateProfile: vi.fn().mockReturnValue(save.promise)
      })
    );
    store.getState().setProfile(savedProfile);

    const savePromise = store.getState().updateProfile(profileRequest);

    expect(store.getState().isSaving).toBe(true);
    expect(store.getState().isLoading).toBe(false);

    save.resolve(renamedProfile);
    await savePromise;

    expect(store.getState().isSaving).toBe(false);
  });

  it('stores a normalized save error and leaves the loaded profile in place', async () => {
    const store = createProfileStore(
      createRepository({
        updateProfile: vi.fn().mockRejectedValue(new Error('Network unavailable'))
      })
    );
    store.getState().setProfile(savedProfile);

    await expect(store.getState().updateProfile(profileRequest)).rejects.toEqual({
      message: 'Network unavailable',
      statusCode: 500
    });
    expect(store.getState()).toMatchObject({
      profile: savedProfile,
      isSaving: false,
      saveError: { message: 'Network unavailable', statusCode: 500 }
    });
  });

  it('does not let a load in flight overwrite a newer save', async () => {
    const load = createDeferred<UserProfile>();
    const store = createProfileStore(
      createRepository({
        getProfile: vi.fn().mockReturnValue(load.promise)
      })
    );

    const loadPromise = store.getState().getProfile();
    await store.getState().updateProfile(profileRequest);

    expect(store.getState().profile).toEqual(renamedProfile);

    load.resolve(savedProfile);
    await loadPromise;

    expect(store.getState().profile).toEqual(renamedProfile);
  });

  it('clears state on reset', async () => {
    const store = createProfileStore(createRepository());

    await store.getState().getProfile();
    store.getState().reset();

    expect(store.getState()).toMatchObject({
      profile: null,
      isLoading: false,
      isSaving: false,
      loadError: null,
      saveError: null
    });
  });
});
