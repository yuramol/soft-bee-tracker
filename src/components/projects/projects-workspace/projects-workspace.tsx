'use client';

import { ArrowLeftIcon, FolderSearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { ErrorState } from '@components/common/error-state/error-state';
import { CreateProjectDialog } from '@components/projects/create-project-dialog/create-project-dialog';
import { ProjectDetails } from '@components/projects/project-details/project-details';
import { ProjectForm } from '@components/projects/project-form/project-form';
import { ProjectList } from '@components/projects/project-list/project-list';
import { ProjectsPageSkeleton } from '@components/projects/projects-skeleton';
import { Button } from '@ui/button';
import type { UserRole } from '@/lib/api/auth';
import {
  useAddProjectMember,
  useCreateProject,
  useProjectRecords,
  useRemoveProjectMember,
  useUpdateProject,
  useUpdateProjectStatus,
  type ProjectRecord,
  type ProjectStatus
} from '@/lib/api/projects';
import { toApiError } from '@/lib/api/to-api-error';
import { useProjectPeople, type ProjectPerson } from '@/lib/api/users';
import { getFullName } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import {
  buildProjectHref,
  DEFAULT_PROJECT_FILTERS,
  getManagerCandidates,
  getProjectAccess,
  getProjectChanges,
  getProjectsPermissions,
  getVisibleProjects,
  isProjectNameTaken,
  parseProjectParams,
  type CreateProjectValues,
  type ProjectFilters,
  type ProjectSubmitOutcome,
  type ProjectUpdateValues,
  type ProjectViewer
} from '@/lib/projects';
import content from '../content.json';

export function ProjectsWorkspace({ viewerId, role }: ProjectsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_PROJECT_FILTERS);
  const projectsQuery = useProjectRecords();
  const peopleQuery = useProjectPeople();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const updateProjectStatus = useUpdateProjectStatus();
  const addProjectMember = useAddProjectMember();
  const removeProjectMember = useRemoveProjectMember();

  const viewer: ProjectViewer = { id: viewerId, role };
  const permissions = getProjectsPermissions(role);
  const { projectId, view } = parseProjectParams(searchParams);
  const projects = projectsQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const visibleProjects = getVisibleProjects(projects, viewer);
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const project = projectId ? visibleProjects.find((item) => item.id === projectId) : undefined;
  const loadError = projectsQuery.error ?? peopleQuery.error;

  function handleRetry() {
    void projectsQuery.refetch();
    void peopleQuery.refetch();
  }

  function checkNameTaken(name: string, exceptId?: string): boolean {
    return isProjectNameTaken(projects, name, exceptId);
  }

  async function handleCreate(values: CreateProjectValues): Promise<ProjectSubmitOutcome> {
    try {
      // admins see every project and a creating manager stays on as a project manager,
      // so the new project is always visible to whoever created it
      const created = await createProject.mutateAsync(values);

      toast.success(formatText(content.create.created, { name: created.name }));
      router.push(buildProjectHref(created.id));

      return 'saved';
    } catch (error) {
      return toFailedOutcome(error);
    }
  }

  async function handleSave(target: ProjectRecord, values: ProjectUpdateValues, baseUpdatedAt: string): Promise<ProjectSubmitOutcome> {
    const changes = getProjectChanges(values, getProjectAccess(target, viewer).editableFields);

    try {
      const result = await updateProject.mutateAsync({ projectId: target.id, changes, baseUpdatedAt });

      if (result.status === 'conflict') {
        return 'conflict';
      }

      toast.success(formatText(content.edit.saved, { name: result.project.name }));
      router.push(buildProjectHref(result.project.id));

      return 'saved';
    } catch (error) {
      return toFailedOutcome(error);
    }
  }

  async function changeStatus(target: ProjectRecord, status: ProjectStatus) {
    try {
      await updateProjectStatus.mutateAsync({ projectId: target.id, status });
      toast.success(formatText(status === 'archived' ? content.details.archived : content.details.restored, { name: target.name }));
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  async function addMember(target: ProjectRecord, member: ProjectPerson) {
    try {
      await addProjectMember.mutateAsync({ projectId: target.id, userId: member.id });
      toast.success(formatText(content.details.members.added, { name: getFullName(member), project: target.name }));
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  async function removeMember(target: ProjectRecord, member: ProjectPerson) {
    try {
      await removeProjectMember.mutateAsync({ projectId: target.id, userId: member.id });
      toast.success(formatText(content.details.members.removed, { name: getFullName(member), project: target.name }));
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  function handleStatusChange(target: ProjectRecord, status: ProjectStatus) {
    void changeStatus(target, status);
  }

  function handleAddMember(target: ProjectRecord, member: ProjectPerson) {
    void addMember(target, member);
  }

  function handleRemoveMember(target: ProjectRecord, member: ProjectPerson) {
    void removeMember(target, member);
  }

  if (projectsQuery.isLoading || peopleQuery.isLoading) {
    return <ProjectsPageSkeleton />;
  }

  if (loadError) {
    return <ErrorState error={loadError} onRetry={handleRetry} />;
  }

  if (!projectId) {
    return (
      <ProjectList
        projects={visibleProjects}
        filters={filters}
        role={role}
        peopleById={peopleById}
        onFiltersChange={setFilters}
        createAction={
          permissions.canCreate ? (
            <CreateProjectDialog
              viewerId={viewer.id}
              canChooseManager={permissions.canChooseManager}
              isCreatorKept={role === 'manager'}
              managerCandidates={getManagerCandidates(people, [viewer.id])}
              isNameTaken={checkNameTaken}
              onCreate={handleCreate}
            />
          ) : null
        }
      />
    );
  }

  if (!project) {
    return <ProjectNotFound />;
  }

  const access = getProjectAccess(project, viewer);

  if (view === 'edit' && access.canEdit) {
    return (
      <ProjectForm
        key={project.id}
        project={project}
        editableFields={access.editableFields}
        managerCandidates={getManagerCandidates(people, [viewer.id, project.managerId])}
        isNameTaken={checkNameTaken}
        onSave={handleSave}
      />
    );
  }

  return (
    <ProjectDetails
      project={project}
      access={access}
      viewer={viewer}
      people={people}
      peopleById={peopleById}
      onStatusChange={handleStatusChange}
      onAddMember={handleAddMember}
      onRemoveMember={handleRemoveMember}
    />
  );
}

function ProjectNotFound() {
  return (
    <EmptyState
      icon={FolderSearchIcon}
      title={content.details.notFound.title}
      description={content.details.notFound.description}
      action={
        <Button variant='outline' render={<Link href={buildProjectHref()} />} nativeButton={false}>
          <ArrowLeftIcon data-icon='inline-start' />
          {content.details.back}
        </Button>
      }
    />
  );
}

// the unique name constraint answers 409, which the form shows on the name field;
// error is unknown because that is what a catch clause receives
function toFailedOutcome(error: unknown): ProjectSubmitOutcome {
  const apiError = toApiError(error);

  if (apiError.statusCode === UNIQUE_CONFLICT_STATUS) {
    return 'name-taken';
  }

  toast.error(apiError.message);

  return 'failed';
}

const UNIQUE_CONFLICT_STATUS = 409;

interface ProjectsWorkspaceProps {
  viewerId: string;
  role: UserRole;
}
