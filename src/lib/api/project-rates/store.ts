'use client';

import { create } from 'zustand';

import { toApiError } from '@/lib/api/to-api-error';
import type { ApiError } from '@/types/api-error';

import { createProjectRate as createProjectRateRequest } from './mutations';
import { getProjectRates as getProjectRatesRequest } from './queries';
import type { CreateProjectRateInput, ProjectRate } from './types';

export interface ProjectRatesRepository {
  getProjectRates: () => Promise<ProjectRate[]>;
  createProjectRate: (input: CreateProjectRateInput) => Promise<ProjectRate>;
}

export interface ProjectRatesStore {
  projectRates: ProjectRate[];
  isLoading: boolean;
  error: ApiError | null;
  getProjectRates: () => Promise<void>;
  createProjectRate: (input: CreateProjectRateInput) => Promise<ProjectRate>;
}

export function createProjectRatesStore(repository: ProjectRatesRepository) {
  return create<ProjectRatesStore>()((set) => {
    let pendingRequests = 0;
    let latestActionId = 0;
    let latestLoadId = 0;
    let collectionRevision = 0;

    function startRequest(): number {
      pendingRequests += 1;
      latestActionId += 1;
      set({ isLoading: true, error: null });
      return latestActionId;
    }

    return {
      projectRates: [],
      isLoading: false,
      error: null,
      getProjectRates: async () => {
        const actionId = startRequest();
        const loadId = ++latestLoadId;
        const revisionAtStart = collectionRevision;

        try {
          const projectRates = await repository.getProjectRates();
          pendingRequests -= 1;
          const canApplyProjectRates = loadId === latestLoadId && revisionAtStart === collectionRevision;

          set({
            ...(canApplyProjectRates ? { projectRates } : {}),
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: null } : {})
          });
        } catch (error) {
          const apiError = toApiError(error);
          pendingRequests -= 1;
          set({
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: apiError } : {})
          });
          throw apiError;
        }
      },
      createProjectRate: async (input) => {
        const actionId = startRequest();

        try {
          const projectRate = await repository.createProjectRate(input);
          pendingRequests -= 1;
          collectionRevision += 1;
          set((state) => ({
            projectRates: [...state.projectRates, projectRate],
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: null } : {})
          }));
          return projectRate;
        } catch (error) {
          const apiError = toApiError(error);
          pendingRequests -= 1;
          set({
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: apiError } : {})
          });
          throw apiError;
        }
      }
    };
  });
}

export const useProjectRatesStore = createProjectRatesStore({
  getProjectRates: getProjectRatesRequest,
  createProjectRate: createProjectRateRequest
});
