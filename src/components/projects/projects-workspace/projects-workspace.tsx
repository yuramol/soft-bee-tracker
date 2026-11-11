'use client';

import { ArrowLeftIcon, FolderSearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { CreateProjectDialog } from '@components/projects/create-project-dialog/create-project-dialog';
import { ProjectDetails } from '@components/projects/project-details/project-details';
import { ProjectForm } from '@components/projects/project-form/project-form';
import { ProjectList } from '@components/projects/project-list/project-list';
import { Button } from '@ui/button';
import type { UserRole } from '@/lib/api/auth';
import type { ProjectStatus } from '@/lib/api/projects';
import { getFullName } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import {
  addProjectMember,
  applyProjectUpdate,
  buildProjectHref,
  createProjectRecord,
  DEFAULT_PROJECT_FILTERS,
  getManagerCandidates,
  getProjectAccess,
  getProjectsPermissions,
  getVisibleProjects,
  isProjectNameTaken,
  parseProjectParams,
  removeProjectMember,
  type CreateProjectValues,
  type ProjectFilters,
  type ProjectUpdateResult,
  type ProjectUpdateValues
} from '@/lib/projects';
import { MOCK_CREW, type CrewMember } from '@/mocks/crew.mock';
import { getMockProjectViewer, MOCK_PROJECTS, type ProjectRecord } from '@/mocks/projects.mock';
import content from '../content.json';

export function ProjectsWorkspace({ role }: ProjectsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectRecord[]>(MOCK_PROJECTS);
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_PROJECT_FILTERS);

  const viewer = getMockProjectViewer(role);
  const permissions = getProjectsPermissions(role);
  const { projectId, view } = parseProjectParams(searchParams);
  const visibleProjects = getVisibleProjects(projects, viewer);
  const peopleById = new Map(MOCK_CREW.map((member) => [member.id, member]));
  const project = projectId ? visibleProjects.find((item) => item.id === projectId) : undefined;

  function updateProject(nextProject: ProjectRecord) {
    setProjects((current) => current.map((item) => (item.id === nextProject.id ? nextProject : item)));
  }

  function checkNameTaken(name: string, exceptId?: string): boolean {
    return isProjectNameTaken(projects, name, exceptId);
  }

  function handleCreate(values: CreateProjectValues) {
    const created = createProjectRecord(values, `p-${Date.now()}`);

    setProjects((current) => [...current, created]);
    toast.success(formatText(content.create.created, { name: created.name }));
    router.push(buildProjectHref(created.id));
  }

  function handleSave(target: ProjectRecord, values: ProjectUpdateValues, baseVersion: number): ProjectUpdateResult {
    const current = projects.find((item) => item.id === target.id) ?? target;
    const result = applyProjectUpdate(current, values, baseVersion, getProjectAccess(current, viewer).editableFields);

    if (result.status === 'saved') {
      updateProject(result.project);
      toast.success(formatText(content.edit.saved, { name: result.project.name }));
      router.push(buildProjectHref(result.project.id));
    }

    return result;
  }

  function handleStatusChange(target: ProjectRecord, status: ProjectStatus) {
    updateProject({ ...target, status, version: target.version + 1 });
    toast.success(formatText(status === 'archived' ? content.details.archived : content.details.restored, { name: target.name }));
  }

  function handleAddMember(target: ProjectRecord, member: CrewMember) {
    updateProject(addProjectMember(target, member.id));
    toast.success(formatText(content.details.members.added, { name: getFullName(member), project: target.name }));
  }

  function handleRemoveMember(target: ProjectRecord, member: CrewMember) {
    updateProject(removeProjectMember(target, member.id));
    toast.success(formatText(content.details.members.removed, { name: getFullName(member), project: target.name }));
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
              managerCandidates={getManagerCandidates(MOCK_CREW)}
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
        managerCandidates={getManagerCandidates(MOCK_CREW)}
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
      crew={MOCK_CREW}
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

interface ProjectsWorkspaceProps {
  role: UserRole;
}
