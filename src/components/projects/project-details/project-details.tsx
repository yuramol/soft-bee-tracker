'use client';

import { ArchiveIcon, ArchiveRestoreIcon, ArrowLeftIcon, ArrowUpRightIcon, ChartColumnIcon, PencilIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { DetailsCard } from '@components/projects/details-card';
import { ProjectDescription } from '@components/projects/project-description';
import { ProjectMembers } from '@components/projects/project-members/project-members';
import { ProjectStatusBadge } from '@components/projects/project-status-badge';
import { Button } from '@ui/button';
import type { ProjectStatus } from '@/lib/api/projects';
import { toSafeExternalUrl } from '@/lib/crew';
import { formatClock } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { buildProjectHref, getAddableMembers, getShortName, summarizeProjectTime, type ProjectAccess } from '@/lib/projects';
import { buildTeamReportHref } from '@/lib/team-report-params';
import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectLink, ProjectRecord, ProjectViewer } from '@/mocks/projects.mock';
import content from '../content.json';

export function ProjectDetails({
  project,
  access,
  viewer,
  crew,
  peopleById,
  onStatusChange,
  onAddMember,
  onRemoveMember
}: ProjectDetailsProps) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const isArchived = project.status === 'archived';
  const nextStatus: ProjectStatus = isArchived ? 'active' : 'archived';
  const statusCopy = isArchived ? content.details.restoreDialog : content.details.archiveDialog;
  const manager = peopleById.get(project.managerId);
  const managerName = manager ? getShortName(manager) : '—';
  const editHref = buildProjectHref(project.id, 'edit');

  function handleStatusClick() {
    setIsStatusDialogOpen(true);
  }

  function handleStatusConfirm() {
    onStatusChange(project, nextStatus);
    setIsStatusDialogOpen(false);
  }

  return (
    <div className='flex flex-col gap-6'>
      <Link
        href={buildProjectHref()}
        className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-fit items-center gap-1.5 rounded-md text-sm outline-none focus-visible:ring-3'
      >
        <ArrowLeftIcon className='size-4' />
        {content.details.back}
      </Link>

      <header className='animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-500 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <h1 className='text-3xl font-semibold tracking-tight break-words'>{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        {access.canEdit || access.canChangeStatus ? (
          <div className='flex flex-wrap items-center gap-2'>
            {access.canEdit ? (
              <Button variant='outline' render={<Link href={editHref} />} nativeButton={false}>
                <PencilIcon data-icon='inline-start' />
                {content.details.edit}
              </Button>
            ) : null}
            {access.canChangeStatus ? (
              <Button variant='outline' onClick={handleStatusClick}>
                {isArchived ? <ArchiveRestoreIcon data-icon='inline-start' /> : <ArchiveIcon data-icon='inline-start' />}
                {isArchived ? content.details.restore : content.details.archive}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {isArchived ? <p className='bg-muted text-muted-foreground rounded-xl px-4 py-3 text-sm'>{content.details.archivedNotice}</p> : null}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]'>
        <DetailsCard title={content.details.overview.title} titleId='project-overview-title'>
          <div className='flex flex-col gap-1.5'>
            <h3 className='text-sm font-semibold'>{content.details.overview.purpose}</h3>
            {project.description ? (
              <ProjectDescription text={project.description} />
            ) : (
              <p className='text-muted-foreground text-sm'>{content.details.overview.empty}</p>
            )}
          </div>
          <p className='text-muted-foreground mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-sm'>
            <span>{formatText(content.details.overview.manager, { name: managerName })}</span>
            <span>{formatText(content.details.overview.status, { status: content.status[project.status] })}</span>
          </p>
        </DetailsCard>

        <ProjectLinksCard links={project.links} addHref={access.canEdit ? editHref : null} />

        <ProjectMembers
          project={project}
          peopleById={peopleById}
          canManage={access.canManageMembers}
          addableMembers={access.canManageMembers ? getAddableMembers(project, crew, viewer) : []}
          isAdmin={viewer.role === 'admin'}
          onAdd={onAddMember}
          onRemove={onRemoveMember}
        />

        <ProjectTimeCard project={project} viewer={viewer} />
      </div>

      <div className='flex flex-col gap-1'>
        <p className='text-sm'>{content.details.footer}</p>
        <p className='text-muted-foreground text-xs'>{content.mockNotice}</p>
      </div>

      {access.canChangeStatus ? (
        <ConfirmDialog
          open={isStatusDialogOpen}
          onOpenChange={setIsStatusDialogOpen}
          title={formatText(statusCopy.title, { name: project.name })}
          description={statusCopy.description}
          confirmLabel={statusCopy.confirmButton}
          onConfirm={handleStatusConfirm}
        />
      ) : null}
    </div>
  );
}

function ProjectLinksCard({ links, addHref }: ProjectLinksCardProps) {
  return (
    <DetailsCard title={content.details.links.title} titleId='project-links-title'>
      {links.length > 0 ? (
        <ul className='flex flex-col gap-3'>
          {links.map((link, index) => (
            <li key={`${index}-${link.url}`} className='min-w-0'>
              <ProjectLinkItem link={link} />
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-muted-foreground text-sm'>{content.details.links.empty}</p>
      )}

      {addHref ? (
        <Link
          href={addHref}
          className='hover:text-foreground focus-visible:ring-ring/50 flex w-fit items-center gap-1.5 rounded-md text-sm font-medium outline-none focus-visible:ring-3'
        >
          <PlusIcon className='size-4' />
          {content.details.links.add}
        </Link>
      ) : null}

      <p className='text-muted-foreground mt-auto border-t pt-4 text-xs'>{content.details.links.accessNote}</p>
    </DetailsCard>
  );
}

function ProjectLinkItem({ link }: { link: ProjectLink }) {
  const safeUrl = toSafeExternalUrl(link.url);

  // stored links are validated on save; anything else still never becomes a clickable href
  if (!safeUrl) {
    return <span className='text-muted-foreground text-sm break-all'>{link.label}</span>;
  }

  return (
    <a
      href={safeUrl}
      target='_blank'
      rel='noopener noreferrer'
      title={safeUrl}
      className='focus-visible:ring-ring/50 flex w-fit max-w-full items-center gap-1 rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3'
    >
      <span className='truncate'>{link.label}</span>
      <ArrowUpRightIcon aria-hidden className='size-4 shrink-0' />
      <span className='sr-only'>{content.details.links.opensInNewTab}</span>
    </a>
  );
}

function ProjectTimeCard({ project, viewer }: ProjectTimeCardProps) {
  const summary = summarizeProjectTime(project, viewer);
  // the Reports page already limits staff to their own time, so the project is the only filter needed
  const reportHref = buildTeamReportHref({ period: 'this-week', projectIds: [project.id] });

  return (
    <DetailsCard title={content.details.time.title} titleId='project-time-title'>
      <div className='flex items-baseline justify-between gap-3'>
        <span>{content.details.time.period}</span>
        <span className='text-2xl font-semibold tabular-nums'>{formatClock(summary.minutes)}</span>
      </div>
      <p className='text-muted-foreground text-sm'>
        {summary.scope === 'own' ? content.details.time.ownScope : content.details.time.teamScope}
      </p>
      <Button variant='outline' className='mt-auto w-full' render={<Link href={reportHref} />} nativeButton={false}>
        <ChartColumnIcon data-icon='inline-start' />
        {content.details.time.openReport}
      </Button>
    </DetailsCard>
  );
}

interface ProjectDetailsProps {
  project: ProjectRecord;
  access: ProjectAccess;
  viewer: ProjectViewer;
  crew: CrewMember[];
  peopleById: Map<string, CrewMember>;
  onStatusChange: (project: ProjectRecord, status: ProjectStatus) => void;
  onAddMember: (project: ProjectRecord, member: CrewMember) => void;
  onRemoveMember: (project: ProjectRecord, member: CrewMember) => void;
}

interface ProjectLinksCardProps {
  links: ProjectLink[];
  addHref: string | null;
}

interface ProjectTimeCardProps {
  project: ProjectRecord;
  viewer: ProjectViewer;
}
