'use client';

import { create } from 'zustand';

import { registerStoreReset } from '@/lib/api/reset-client-state';
import { toApiError } from '@/lib/api/to-api-error';
import type { ApiError } from '@/types/api-error';

import { createProject as createProjectRequest } from './mutations';
import { useProjectsStore } from './store';
import type { CreateProjectInput, Project } from './types';

export interface CreateProjectRepository {
  createProject: (input: CreateProjectInput) => Promise<Project>;
}

export interface CreateProjectStore {
  isCreating: boolean;
  createError: ApiError | null;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  reset: () => void;
}

const initialState = {
  isCreating: false,
  createError: null
} satisfies Pick<CreateProjectStore, 'isCreating' | 'createError'>;

export function createCreateProjectStore(repository: CreateProjectRepository, onCreated: (project: Project) => void) {
  return create<CreateProjectStore>()((set) => {
    let generation = 0;
    let pendingRequests = 0;
    let latestActionId = 0;

    return {
      ...initialState,
      createProject: async (input) => {
        const requestGeneration = generation;
        const actionId = ++latestActionId;
        pendingRequests += 1;
        set({ isCreating: true, createError: null });

        try {
          const project = await repository.createProject(input);
          pendingRequests = Math.max(0, pendingRequests - 1);

          if (requestGeneration === generation) {
            onCreated(project);
            set({
              isCreating: pendingRequests > 0,
              ...(actionId === latestActionId ? { createError: null } : {})
            });
          }

          return project;
        } catch (error) {
          const apiError = toApiError(error);
          pendingRequests = Math.max(0, pendingRequests - 1);

          if (requestGeneration === generation) {
            set({
              isCreating: pendingRequests > 0,
              ...(actionId === latestActionId ? { createError: apiError } : {})
            });
          }

          throw apiError;
        }
      },
      reset: () => {
        generation += 1;
        latestActionId += 1;
        pendingRequests = 0;
        set(initialState);
      }
    };
  });
}

export const useCreateProjectStore = createCreateProjectStore({ createProject: createProjectRequest }, (project) =>
  useProjectsStore.getState().addUserProject(project)
);

registerStoreReset(() => useCreateProjectStore.getState().reset());
