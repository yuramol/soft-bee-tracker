'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { mapCreateProjectArgs, mapProjectChangesToRow, mapProjectRowToProject, PROJECT_COLUMNS } from '@/lib/api/projects/mappers';
import { projectKeys } from '@/lib/api/projects/queries';
import type {
  CreatedProject,
  CreateProjectInput,
  Project,
  ProjectMemberInput,
  UpdateProjectInput,
  UpdateProjectResult,
  UpdateProjectStatusInput
} from '@/lib/api/projects/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

// one transaction: the project, its responsible person and the chosen managers as members.
// a creating manager who names someone else responsible stays on the project
export async function createProject(input: CreateProjectInput): Promise<CreatedProject> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.rpc('create_project', mapCreateProjectArgs(input));

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return { id: data, name: input.name.trim() };
}

// saves only when nobody changed the project since baseUpdatedAt was read
export async function updateProject({ projectId, changes, baseUpdatedAt }: UpdateProjectInput): Promise<UpdateProjectResult> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('projects')
    .update(mapProjectChangesToRow(changes))
    .eq('id', projectId)
    .eq('updated_at', baseUpdatedAt)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return data ? { status: 'saved', project: mapProjectRowToProject(data) } : { status: 'conflict' };
}

export async function updateProjectStatus({ projectId, status }: UpdateProjectStatusInput): Promise<Project> {
  const supabase = createBrowserClient();
  const {
    data,
    error,
    status: responseStatus
  } = await supabase.from('projects').update({ status }).eq('id', projectId).select(PROJECT_COLUMNS).single();

  if (error) {
    throw {
      message: error.message,
      statusCode: responseStatus
    } satisfies ApiError;
  }

  return mapProjectRowToProject(data);
}

// the person's role decides their rights: managers and admins can manage the project
export async function addProjectMember({ projectId, userId }: ProjectMemberInput): Promise<void> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('project_rates').insert({ project_id: projectId, user_id: userId });

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }
}

export async function removeProjectMember({ projectId, userId }: ProjectMemberInput): Promise<void> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('project_rates').delete().eq('project_id', projectId).eq('user_id', userId);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }
}

export function useCreateProject() {
  return useProjectMutation(createProject);
}

export function useUpdateProject() {
  return useProjectMutation(updateProject);
}

export function useUpdateProjectStatus() {
  return useProjectMutation(updateProjectStatus);
}

export function useAddProjectMember() {
  return useProjectMutation(addProjectMember);
}

export function useRemoveProjectMember() {
  return useProjectMutation(removeProjectMember);
}

function useProjectMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();

  return useMutation<TResult, ApiError, TInput>({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all })
  });
}
