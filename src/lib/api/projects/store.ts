'use client';

import { create } from 'zustand';

import { registerStoreReset } from '@/lib/api/reset-client-state';
import { toApiError } from '@/lib/api/to-api-error';
import type { ApiError } from '@/types/api-error';

import { getProjects as getProjectsRequest, getUserProjects as getUserProjectsRequest } from './queries';
import type { Project } from './types';

export interface ProjectsRepository {
  getProjects: () => Promise<Project[]>;
  getUserProjects: () => Promise<Project[]>;
}

export interface ProjectsStore {
  projects: Project[];
  userProjects: Project[];
  isLoading: boolean;
  error: ApiError | null;
  getProjects: () => Promise<void>;
  getUserProjects: () => Promise<void>;
  addUserProject: (project: Project) => void;
  reset: () => void;
}

const initialState = {
  projects: [],
  userProjects: [],
  isLoading: false,
  error: null
} satisfies Pick<ProjectsStore, 'projects' | 'userProjects' | 'isLoading' | 'error'>;

export function createProjectsStore(repository: ProjectsRepository) {
  return create<ProjectsStore>()((set) => {
    let pendingRequests = 0;
    let latestActionId = 0;
    let latestProjectsLoadId = 0;
    let latestUserProjectsLoadId = 0;
    let userProjectsRevision = 0;

    function startRequest(): number {
      pendingRequests += 1;
      latestActionId += 1;
      set({ isLoading: true, error: null });
      return latestActionId;
    }

    function finishRequest() {
      pendingRequests = Math.max(0, pendingRequests - 1);
    }

    return {
      ...initialState,
      reset: () => {
        pendingRequests = 0;
        latestActionId += 1;
        latestProjectsLoadId += 1;
        latestUserProjectsLoadId += 1;
        userProjectsRevision += 1;
        set(initialState);
      },
      getProjects: async () => {
        const actionId = startRequest();
        const loadId = ++latestProjectsLoadId;

        try {
          const projects = await repository.getProjects();
          finishRequest();
          set({
            ...(loadId === latestProjectsLoadId ? { projects } : {}),
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: null } : {})
          });
        } catch (error) {
          const apiError = toApiError(error);
          finishRequest();
          set({
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: apiError } : {})
          });
          throw apiError;
        }
      },
      getUserProjects: async () => {
        const actionId = startRequest();
        const loadId = ++latestUserProjectsLoadId;
        const revisionAtStart = userProjectsRevision;

        try {
          const userProjects = await repository.getUserProjects();
          finishRequest();
          const canApplyProjects = loadId === latestUserProjectsLoadId && revisionAtStart === userProjectsRevision;

          set({
            ...(canApplyProjects ? { userProjects } : {}),
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: null } : {})
          });
        } catch (error) {
          const apiError = toApiError(error);
          finishRequest();
          set({
            isLoading: pendingRequests > 0,
            ...(actionId === latestActionId ? { error: apiError } : {})
          });
          throw apiError;
        }
      },
      addUserProject: (project) => {
        userProjectsRevision += 1;
        set((state) => ({
          userProjects: state.userProjects.some(({ id }) => id === project.id) ? state.userProjects : [...state.userProjects, project]
        }));
      }
    };
  });
}

export const useProjectsStore = createProjectsStore({
  getProjects: getProjectsRequest,
  getUserProjects: getUserProjectsRequest
});

registerStoreReset(() => useProjectsStore.getState().reset());
