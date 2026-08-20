'use client';

import { create } from 'zustand';

import { registerStoreReset } from '@/lib/api/reset-client-state';
import { toApiError } from '@/lib/api/to-api-error';
import type { ApiError } from '@/types/api-error';

import { createProject as createProjectRequest } from './mutations';
import { getProjects as getProjectsRequest } from './queries';
import type { CreateProjectInput, Project } from './types';

export interface ProjectsRepository {
  getProjects: () => Promise<Project[]>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
}

export interface ProjectsStore {
  projects: Project[];
  isLoading: boolean;
  error: ApiError | null;
  getProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  reset: () => void;
}

export function createProjectsStore(repository: ProjectsRepository) {
  return create<ProjectsStore>()((set) => {
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
      projects: [],
      isLoading: false,
      error: null,
      reset: () => {
        // bumping the guards stops an in-flight response from writing the
        // previous session's data back after the store has been cleared
        pendingRequests = 0;
        latestActionId += 1;
        latestLoadId += 1;
        collectionRevision += 1;
        set({ projects: [], isLoading: false, error: null });
      },
      getProjects: async () => {
        const actionId = startRequest();
        const loadId = ++latestLoadId;
        const revisionAtStart = collectionRevision;

        try {
          const projects = await repository.getProjects();
          pendingRequests -= 1;
          const canApplyProjects = loadId === latestLoadId && revisionAtStart === collectionRevision;

          set({
            ...(canApplyProjects ? { projects } : {}),
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
      createProject: async (input) => {
        const actionId = startRequest();

        try {
          const project = await repository.createProject(input);
          pendingRequests -= 1;
          collectionRevision += 1;
          set((state) => ({
            projects: [...state.projects, project],
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: null } : {})
          }));
          return project;
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

export const useProjectsStore = createProjectsStore({
  getProjects: getProjectsRequest,
  createProject: createProjectRequest
});

// logout clears every store that has been loaded this session
registerStoreReset(() => useProjectsStore.getState().reset());
