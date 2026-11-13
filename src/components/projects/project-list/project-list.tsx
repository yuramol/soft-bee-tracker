'use client';

import { FolderKanbanIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { IconInput } from '@components/common/form/icon-input';
import { PageHeader } from '@components/common/page-header/page-header';
import { ProjectStatusBadge } from '@components/projects/project-status-badge';
import { Button } from '@ui/button';
import { Field, FieldLabel } from '@ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import type { UserRole } from '@/lib/api/auth';
import type { ProjectStatus } from '@/lib/api/projects';
import { formatText } from '@/lib/format-text';
import { buildProjectHref, filterProjects, getDescriptionSummary, getShortName, type ProjectFilters } from '@/lib/projects';
import { cn } from '@/lib/utils';
import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectRecord } from '@/mocks/projects.mock';
import content from '../content.json';

export function ProjectList({ projects, filters, role, peopleById, createAction, onFiltersChange }: ProjectListProps) {
  const filteredProjects = filterProjects(projects, filters);

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, query: event.target.value });
  }

  function handleStatusChange(value: ProjectStatus | null) {
    if (value) {
      onFiltersChange({ ...filters, status: value });
    }
  }

  return (
    <>
      <PageHeader title={content.title} actions={createAction} />

      <div className='flex flex-col gap-6'>
        <div className='grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:max-w-4xl'>
          <Field>
            <FieldLabel htmlFor='projectSearch'>{content.list.searchLabel}</FieldLabel>
            <IconInput
              id='projectSearch'
              type='search'
              icon={SearchIcon}
              placeholder={content.list.searchPlaceholder}
              value={filters.query}
              onChange={handleQueryChange}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='projectStatus'>{content.list.statusLabel}</FieldLabel>
            <Select<ProjectStatus> value={filters.status} onValueChange={handleStatusChange} items={STATUS_OPTIONS}>
              <SelectTrigger id='projectStatus' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {filteredProjects.length > 0 ? (
          <ul className='animate-in fade-in flex flex-col gap-3 duration-500'>
            {filteredProjects.map((project) => (
              <ProjectListCard key={project.id} project={project} manager={peopleById.get(project.managerId)} />
            ))}
          </ul>
        ) : (
          <ProjectListEmpty hasAnyProjects={projects.length > 0} role={role} />
        )}

        <p className='text-muted-foreground text-xs'>{content.mockNotice}</p>
      </div>
    </>
  );
}

function ProjectListCard({ project, manager }: ProjectListCardProps) {
  const summary = getDescriptionSummary(project.description);
  const memberCount = project.memberIds.length;

  return (
    <li
      className={cn(
        'bg-card hover:border-foreground/20 grid gap-3 rounded-2xl border p-4 transition-colors sm:px-6 sm:py-5',
        'lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] lg:items-center lg:gap-x-6'
      )}
    >
      <div className='flex min-w-0 flex-col gap-1'>
        <h2 className='text-lg font-semibold break-words'>{project.name}</h2>
        <p className={cn('truncate text-sm', !summary && 'text-muted-foreground')}>{summary || content.list.noDescription}</p>
      </div>

      <div className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-sm lg:flex-col'>
        <span className='truncate'>{formatText(content.list.managerLabel, { name: manager ? getShortName(manager) : '—' })}</span>
        <span>{memberCount === 1 ? content.list.oneMember : formatText(content.list.members, { count: memberCount })}</span>
      </div>

      <div className='flex items-center justify-between gap-4 border-t pt-3 lg:border-t-0 lg:pt-0'>
        <ProjectStatusBadge status={project.status} />
        <Button
          variant='outline'
          aria-label={formatText(content.list.openLabel, { name: project.name })}
          render={<Link href={buildProjectHref(project.id)} />}
          nativeButton={false}
        >
          {content.list.open}
        </Button>
      </div>
    </li>
  );
}

function ProjectListEmpty({ hasAnyProjects, role }: ProjectListEmptyProps) {
  const copy = hasAnyProjects ? content.list.empty.filtered : content.list.empty[role];

  return <EmptyState icon={FolderKanbanIcon} title={copy.title} description={copy.description} />;
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'active', label: content.status.active },
  { value: 'archived', label: content.status.archived }
];

interface ProjectListProps {
  projects: ProjectRecord[];
  filters: ProjectFilters;
  role: UserRole;
  peopleById: Map<string, CrewMember>;
  createAction: ReactNode;
  onFiltersChange: (filters: ProjectFilters) => void;
}

interface ProjectListCardProps {
  project: ProjectRecord;
  manager: CrewMember | undefined;
}

interface ProjectListEmptyProps {
  hasAnyProjects: boolean;
  role: UserRole;
}
