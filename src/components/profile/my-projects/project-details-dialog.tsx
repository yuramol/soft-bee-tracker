'use client';

import { format, parseISO } from 'date-fns';
import { ChartColumnIcon, ClockIcon, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import projectsContent from '@components/projects/content.json';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { ROUTES } from '@/constants';
import type { MemberProject, Project, ProjectType } from '@/lib/api/projects';
import { formatText } from '@/lib/format-text';
import content from '../content.json';

export function ProjectDetailsDialog({ memberProject, canEdit }: ProjectDetailsDialogProps) {
  const { project, membership } = memberProject;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant='outline' className='shrink-0' aria-label={formatText(content.projects.openLabel, { name: project.name })} />
        }
      >
        {content.projects.open}
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <ProjectAvatar project={project} />
            <div className='flex min-w-0 flex-col gap-1'>
              <DialogTitle className='truncate'>{project.name}</DialogTitle>
              <div className='flex flex-wrap gap-1.5'>
                <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>{content.projects.status[project.status]}</Badge>
                <Badge variant='outline'>{content.projects.membership[membership]}</Badge>
              </div>
            </div>
          </div>
          <DialogDescription className='pt-2 whitespace-pre-line'>{project.note || content.projects.noDescription}</DialogDescription>
        </DialogHeader>

        <dl className='grid gap-4 border-t pt-4 sm:grid-cols-3'>
          <DetailItem label={content.projects.client}>{project.client}</DetailItem>
          <DetailItem label={content.projects.type}>{PROJECT_TYPE_LABELS[project.type]}</DetailItem>
          <DetailItem label={content.projects.dates}>{formatProjectDates(project)}</DetailItem>
        </dl>

        <DialogFooter className='gap-2'>
          {project.status === 'active' ? (
            <Button variant='outline' render={<Link href={ROUTES.TRACKER} />} nativeButton={false}>
              <ClockIcon data-icon='inline-start' />
              {content.projects.trackTime}
            </Button>
          ) : null}
          <Button variant='outline' render={<Link href={ROUTES.REPORTS} />} nativeButton={false}>
            <ChartColumnIcon data-icon='inline-start' />
            {content.projects.viewReport}
          </Button>
          {canEdit ? (
            <Button variant='outline' render={<Link href={ROUTES.PROJECTS} />} nativeButton={false}>
              <PencilIcon data-icon='inline-start' />
              {content.projects.editProject}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectAvatar({ project }: ProjectAvatarProps) {
  return (
    <Avatar className='size-10 shrink-0 rounded-xl'>
      {project.pictureUrl ? <AvatarImage src={project.pictureUrl} alt={project.name} /> : null}
      <AvatarFallback className='bg-brand-black text-electric-green rounded-xl font-semibold'>{getInitials(project.name)}</AvatarFallback>
    </Avatar>
  );
}

function DetailItem({ label, children }: DetailItemProps) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5'>
      <dt className='text-muted-foreground text-xs'>{label}</dt>
      <dd className='text-sm break-words'>{children}</dd>
    </div>
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
  if (!project.startDate) {
    return '—';
  }

  const end = project.endDate ? format(parseISO(project.endDate), 'MMM yyyy') : content.projects.openEnded;

  return `${format(parseISO(project.startDate), 'MMM yyyy')} – ${end}`;
}

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = projectsContent.types;

interface ProjectDetailsDialogProps {
  memberProject: MemberProject;
  canEdit: boolean;
}

interface ProjectAvatarProps {
  project: Project;
}

interface DetailItemProps {
  label: string;
  children: ReactNode;
}
