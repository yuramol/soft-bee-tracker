'use client';

import { create } from 'zustand';

import { registerStoreReset } from '@/lib/api/reset-client-state';
import { toApiError } from '@/lib/api/to-api-error';
import type { ApiError } from '@/types/api-error';

import { updateProfile as updateProfileRequest } from './mutations';
import { fetchSessionProfile } from './queries';
import type { UpdateProfileRequest, UserProfile } from './types';

export interface ProfileRepository {
  getProfile: () => Promise<UserProfile | null>;
  updateProfile: (request: UpdateProfileRequest) => Promise<UserProfile>;
}

export interface ProfileStore {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError: ApiError | null;
  saveError: ApiError | null;
  getProfile: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (request: UpdateProfileRequest) => Promise<UserProfile>;
  reset: () => void;
}

// reading and saving keep separate flags so a slow save never reads as "loading"
// and a failed save does not blank out a profile that loaded fine
const initialState = {
  profile: null,
  isLoading: false,
  isSaving: false,
  loadError: null,
  saveError: null
} satisfies ProfileState;

export function createProfileStore(repository: ProfileRepository) {
  return create<ProfileStore>()((set) => {
    let latestLoadId = 0;
    let latestSaveId = 0;

    return {
      ...initialState,
      getProfile: async () => {
        const loadId = ++latestLoadId;
        set({ isLoading: true, loadError: null });

        try {
          const profile = await repository.getProfile();

          // a superseded load must not publish its stale row
          if (loadId === latestLoadId) {
            set({ profile, isLoading: false, loadError: null });
          }
        } catch (error) {
          const apiError = toApiError(error);

          if (loadId === latestLoadId) {
            set({ isLoading: false, loadError: apiError });
          }

          throw apiError;
        }
      },
      setProfile: (profile) => {
        // server components already resolve the profile; seeding it here keeps the
        // store authoritative on the client without a second round trip
        latestLoadId += 1;
        set({ profile, isLoading: false, loadError: null });
      },
      updateProfile: async (request) => {
        const saveId = ++latestSaveId;
        set({ isSaving: true, saveError: null });

        try {
          const profile = await repository.updateProfile(request);

          if (saveId === latestSaveId) {
            // the saved row is the newest truth, so it also settles any load in flight
            latestLoadId += 1;
            set({ profile, isSaving: false, saveError: null });
          }

          return profile;
        } catch (error) {
          const apiError = toApiError(error);

          if (saveId === latestSaveId) {
            set({ isSaving: false, saveError: apiError });
          }

          throw apiError;
        }
      },
      reset: () => {
        // bumping the guards stops work in flight from publishing after a logout
        latestLoadId += 1;
        latestSaveId += 1;
        set(initialState);
      }
    };
  });
}

export const useProfileStore = createProfileStore({
  getProfile: fetchSessionProfile,
  updateProfile: updateProfileRequest
});

// logout clears every store that has been loaded this session
registerStoreReset(() => useProfileStore.getState().reset());

type ProfileState = Pick<ProfileStore, 'profile' | 'isLoading' | 'isSaving' | 'loadError' | 'saveError'>;
