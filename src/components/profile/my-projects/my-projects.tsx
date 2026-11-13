'use client';

import { FolderKanbanIcon } from 'lucide-react';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { ErrorState } from '@components/common/error-state/error-state';
import { ProjectAvatar, ProjectDetailsDialog } from '@components/profile/my-projects/project-details-dialog';
import { Skeleton } from '@ui/skeleton';
import { useMyProjects } from '@/lib/api/projects';
import type { MemberProject } from '@/lib/api/projects';
import type { UserRole } from '@/lib/api/auth';
import { canEditMemberProject } from '@/lib/profile';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function MyProjects({ role }: MyProjectsProps) {
  const { data: memberProjects = [], isLoading, error, refetch } = useMyProjects();

  function handleRetry() {
    void refetch();
  }

  return (
    <section aria-labelledby='my-projects-title' className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h2 id='my-projects-title' className='text-lg font-semibold tracking-tight'>
          {content.projects.title}
        </h2>
        <p className='text-muted-foreground text-sm'>{content.projects.description}</p>
      </div>
      <MyProjectsContent role={role} isLoading={isLoading} error={error} memberProjects={memberProjects} onRetry={handleRetry} />
    </section>
  );
}

function MyProjectsContent({ role, isLoading, error, memberProjects, onRetry }: MyProjectsContentProps) {
  if (isLoading) {
    return <MyProjectsSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (memberProjects.length === 0) {
    return <EmptyState icon={FolderKanbanIcon} title={content.projects.emptyTitle} description={content.projects.emptyDescription} />;
  }

  return (
    <ul className='bg-card divide-y rounded-2xl border'>
      {memberProjects.map((memberProject) => (
        <MyProjectRow
          key={memberProject.project.id}
          memberProject={memberProject}
          canEdit={canEditMemberProject({ role }, memberProject)}
        />
      ))}
    </ul>
  );
}

function MyProjectRow({ memberProject, canEdit }: MyProjectRowProps) {
  const { project, membership } = memberProject;

  return (
    <li className='flex items-center gap-3 px-4 py-3 sm:px-5'>
      <ProjectAvatar project={project} />
      <div className='flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-6'>
        <div className='flex min-w-0 flex-col sm:w-56 sm:shrink-0'>
          <span className='truncate font-semibold'>{project.name}</span>
          <span className='text-muted-foreground truncate text-xs'>{project.client}</span>
        </div>
        <span className='text-muted-foreground text-sm'>
          <span className={cn(project.status === 'active' && 'text-foreground')}>{content.projects.status[project.status]}</span>
          {' · '}
          {content.projects.membership[membership]}
        </span>
      </div>
      <ProjectDetailsDialog memberProject={memberProject} canEdit={canEdit} />
    </li>
  );
}

function MyProjectsSkeleton() {
  return (
    <div className='bg-card divide-y rounded-2xl border' aria-hidden>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className='flex items-center gap-3 px-4 py-3 sm:px-5'>
          <Skeleton className='size-10 rounded-xl' />
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-3 w-20' />
          </div>
          <Skeleton className='h-9 w-16 rounded-lg' />
        </div>
      ))}
    </div>
  );
}

interface MyProjectsProps {
  role: UserRole;
}

interface MyProjectsContentProps {
  role: UserRole;
  isLoading: boolean;
  error: ApiError | null;
  memberProjects: MemberProject[];
  onRetry: () => void;
}

interface MyProjectRowProps {
  memberProject: MemberProject;
  canEdit: boolean;
}
