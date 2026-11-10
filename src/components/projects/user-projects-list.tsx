'use client';

import { format, parseISO } from 'date-fns';
import { ArchiveIcon, ArchiveRestoreIcon, CalendarIcon, EllipsisIcon, FolderKanbanIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { EmptyState } from '@components/common/empty-state/empty-state';
import { ErrorState } from '@components/common/error-state/error-state';
import { ProjectGridSkeleton } from '@components/projects/projects-skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs';
import { useUpdateProjectStatus, useUserProjects } from '@/lib/api/projects';
import type { Project, ProjectStatus, ProjectType } from '@/lib/api/projects';
import type { ApiError } from '@/types/api-error';
import { formatText } from '@/lib/format-text';
import content from './content.json';

export function UserProjectsList() {
  const { data: userProjects = [], isLoading, error, refetch } = useUserProjects();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('active');
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const updateProjectStatus = useUpdateProjectStatus();
  const updatingProjectId = updateProjectStatus.isPending ? (updateProjectStatus.variables?.projectId ?? null) : null;
  const visibleProjects = userProjects.filter((project) => project.status === statusFilter);

  function changeProjectStatus({ project, status }: PendingStatusChange) {
    function handleStatusChanged() {
      toast.success(formatText(status === 'archived' ? content.list.archived : content.list.restored, { name: project.name }));
      setIsStatusDialogOpen(false);
    }

    function handleStatusChangeFailed(updateError: ApiError) {
      toast.error(updateError.message || content.list.updateFailed);
    }

    updateProjectStatus.mutate({ projectId: project.id, status }, { onSuccess: handleStatusChanged, onError: handleStatusChangeFailed });
  }

  function handleRetry() {
    void refetch();
  }

  function requestStatusChange(project: Project, status: ProjectStatus) {
    setPendingChange({ project, status });
    setIsStatusDialogOpen(true);
  }

  function handleArchiveRequest(project: Project) {
    requestStatusChange(project, 'archived');
  }

  function handleRestoreRequest(project: Project) {
    requestStatusChange(project, 'active');
  }

  function handleStatusConfirm() {
    if (pendingChange) {
      changeProjectStatus(pendingChange);
    }
  }

  function handleStatusChange(value: ProjectStatus) {
    setStatusFilter(value);
  }

  return (
    <div className='flex flex-col gap-5'>
      <Tabs value={statusFilter} onValueChange={handleStatusChange}>
        <TabsList>
          <TabsTrigger value='active'>{content.list.tabs.active}</TabsTrigger>
          <TabsTrigger value='archived'>{content.list.tabs.archived}</TabsTrigger>
        </TabsList>
      </Tabs>

      <ProjectsGridContent
        isLoading={isLoading}
        error={error}
        projects={visibleProjects}
        statusFilter={statusFilter}
        updatingProjectId={updatingProjectId}
        onRetry={handleRetry}
        onArchive={handleArchiveRequest}
        onRestore={handleRestoreRequest}
      />

      {pendingChange ? (
        <ConfirmDialog
          open={isStatusDialogOpen}
          onOpenChange={setIsStatusDialogOpen}
          {...STATUS_CHANGE_COPY[pendingChange.status](pendingChange.project.name)}
          isBusy={updatingProjectId === pendingChange.project.id}
          onConfirm={handleStatusConfirm}
        />
      ) : null}
    </div>
  );
}

function ProjectsGridContent({
  isLoading,
  error,
  projects,
  statusFilter,
  updatingProjectId,
  onRetry,
  onArchive,
  onRestore
}: ProjectsGridContentProps) {
  if (isLoading) {
    return <ProjectGridSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanbanIcon}
        title={content.list.empty[statusFilter].title}
        description={content.list.empty[statusFilter].description}
      />
    );
  }

  return (
    <ul className='animate-in fade-in grid gap-4 duration-500 sm:grid-cols-2 xl:grid-cols-3'>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isUpdating={updatingProjectId === project.id}
          onArchive={onArchive}
          onRestore={onRestore}
        />
      ))}
    </ul>
  );
}

function ProjectCard({ project, isUpdating, onArchive, onRestore }: ProjectCardProps) {
  return (
    <li
      data-busy={isUpdating}
      className='bg-card flex flex-col gap-4 rounded-2xl border p-5 transition-opacity data-[busy=true]:opacity-60'
    >
      <div className='flex items-center gap-3'>
        <Avatar className='size-11 rounded-xl'>
          {project.pictureUrl ? <AvatarImage src={project.pictureUrl} alt={project.name} /> : null}
          <AvatarFallback className='bg-brand-black text-electric-green rounded-xl font-semibold'>
            {getInitials(project.name)}
          </AvatarFallback>
        </Avatar>
        <div className='flex min-w-0 flex-col'>
          <span className='truncate font-semibold'>{project.name}</span>
          <span className='text-muted-foreground truncate text-sm'>{project.client}</span>
        </div>
        <ProjectActions project={project} isDisabled={isUpdating} onArchive={onArchive} onRestore={onRestore} />
      </div>

      {project.note ? <p className='text-muted-foreground line-clamp-2 text-sm'>{project.note}</p> : null}

      <div className='mt-auto flex flex-wrap items-center justify-between gap-2'>
        <Badge variant='outline'>{PROJECT_TYPE_LABELS[project.type]}</Badge>
        {project.startDate ? (
          <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <CalendarIcon className='size-3.5' />
            {formatProjectDates(project)}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ProjectActions({ project, isDisabled, onArchive, onRestore }: ProjectActionsProps) {
  const isArchived = project.status === 'archived';

  function handleArchiveClick() {
    onArchive(project);
  }

  function handleRestoreClick() {
    onRestore(project);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={formatText(content.list.actionsLabel, { name: project.name })}
            disabled={isDisabled}
            className='ml-auto shrink-0'
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-44'>
        {isArchived ? (
          <DropdownMenuItem onClick={handleRestoreClick}>
            <ArchiveRestoreIcon />
            {content.list.restoreAction}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleArchiveClick}>
            <ArchiveIcon />
            {content.list.archiveAction}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

function formatProjectDates(project: Project): string {
  const start = project.startDate ? format(parseISO(project.startDate), 'MMM yyyy') : '';
  const end = project.endDate ? format(parseISO(project.endDate), 'MMM yyyy') : content.list.openEnded;

  return `${start} – ${end}`;
}

const STATUS_CHANGE_COPY: Record<ProjectStatus, (name: string) => { title: string; description: string; confirmLabel: string }> = {
  archived: (name) => ({
    title: formatText(content.list.archiveDialog.title, { name }),
    description: content.list.archiveDialog.description,
    confirmLabel: content.list.archiveDialog.confirmButton
  }),
  active: (name) => ({
    title: formatText(content.list.restoreDialog.title, { name }),
    description: content.list.restoreDialog.description,
    confirmLabel: content.list.restoreDialog.confirmButton
  })
};

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = content.types;

interface PendingStatusChange {
  project: Project;
  status: ProjectStatus;
}

interface ProjectsGridContentProps {
  isLoading: boolean;
  error: ApiError | null;
  projects: Project[];
  statusFilter: ProjectStatus;
  updatingProjectId: string | null;
  onRetry: () => void;
  onArchive: (project: Project) => void;
  onRestore: (project: Project) => void;
}

interface ProjectCardProps {
  project: Project;
  isUpdating: boolean;
  onArchive: (project: Project) => void;
  onRestore: (project: Project) => void;
}

interface ProjectActionsProps {
  project: Project;
  isDisabled: boolean;
  onArchive: (project: Project) => void;
  onRestore: (project: Project) => void;
}
