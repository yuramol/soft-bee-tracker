'use client';

import { EllipsisIcon, ShieldIcon, UserCheckIcon, UserXIcon } from 'lucide-react';
import Link from 'next/link';

import { MemberStatusBadge } from '@components/crew/member-status-badge';
import { Avatar, AvatarFallback } from '@ui/avatar';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { getFullName, getMemberProfileHref } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import { cn, getUserAvatarFallback } from '@/lib/utils';
import type { CrewMember } from '@/mocks/crew.mock';
import content from '../content.json';

export function CrewMemberCard({ member, managerName, canManage, onAction }: CrewMemberCardProps) {
  const name = getFullName(member);
  const profileHref = getMemberProfileHref(member.id);

  return (
    <li
      className={cn(
        'bg-card hover:border-foreground/20 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-4 transition-colors sm:px-5',
        'lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-4'
      )}
    >
      <Link
        href={profileHref}
        className='focus-visible:ring-ring/50 group/member col-start-1 row-start-1 -m-1 flex min-w-0 items-center gap-3 rounded-xl p-1 outline-none focus-visible:ring-3'
      >
        <Avatar className='size-10 shrink-0'>
          <AvatarFallback>{getUserAvatarFallback(member)}</AvatarFallback>
        </Avatar>
        <span className='flex min-w-0 flex-col gap-0.5'>
          <span className='font-semibold break-words underline-offset-4 group-hover/member:underline lg:truncate'>{name}</span>
          <span className='text-muted-foreground text-sm break-words lg:truncate'>
            {content.roles[member.role]} · {member.position}
          </span>
        </span>
      </Link>

      <div className='col-span-2 row-start-2 flex min-w-0 flex-col gap-0.5 border-t pt-3 text-sm lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:border-t-0 lg:pt-0'>
        <span className={cn('break-words lg:truncate', member.projects.length === 0 && 'text-muted-foreground')}>
          {member.projects.length > 0 ? member.projects.join(', ') : content.people.noProjects}
        </span>
        <span className='text-muted-foreground text-xs break-words lg:truncate'>
          {content.people.managerLabel}: {managerName ?? content.people.noManager}
        </span>
      </div>

      <div className='col-span-2 row-start-3 flex items-center justify-between gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1'>
        <MemberStatusBadge status={member.status} />
        <Button
          variant='outline'
          aria-label={formatText(content.people.openLabel, { name })}
          render={<Link href={profileHref} />}
          nativeButton={false}
        >
          {content.people.open}
        </Button>
      </div>

      {canManage ? (
        <div className='col-start-2 row-start-1 -mt-1 -mr-2 lg:col-start-4 lg:m-0'>
          <MemberActionsMenu member={member} name={name} onAction={onAction} />
        </div>
      ) : null}
    </li>
  );
}

function MemberActionsMenu({ member, name, onAction }: MemberActionsMenuProps) {
  function handleChangeRoleClick() {
    onAction('role', member);
  }

  function handleAccessClick() {
    onAction(member.status === 'blocked' ? 'reactivate' : 'block', member);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label={formatText(content.actions.menuLabel, { name })} />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-44'>
        <DropdownMenuItem onClick={handleChangeRoleClick}>
          <ShieldIcon />
          {content.actions.changeRole}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {member.status === 'blocked' ? (
          <DropdownMenuItem onClick={handleAccessClick}>
            <UserCheckIcon />
            {content.actions.reactivate}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant='destructive' onClick={handleAccessClick}>
            <UserXIcon />
            {content.actions.block}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type MemberActionType = 'role' | 'block' | 'reactivate';

export type MemberActionHandler = (type: MemberActionType, member: CrewMember) => void;

interface CrewMemberCardProps {
  member: CrewMember;
  managerName: string | null;
  canManage: boolean;
  onAction: MemberActionHandler;
}

interface MemberActionsMenuProps {
  member: CrewMember;
  name: string;
  onAction: MemberActionHandler;
}
