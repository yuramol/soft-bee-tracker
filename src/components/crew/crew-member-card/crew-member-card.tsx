'use client';

import { EllipsisIcon, ShieldIcon, UserCheckIcon, UserXIcon } from 'lucide-react';
import Link from 'next/link';

import { MemberStatusBadge } from '@components/crew/member-status-badge';
import { Avatar, AvatarFallback } from '@ui/avatar';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { getFullName, getMemberProfileHref } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import { getUserAvatarFallback } from '@/lib/utils';
import type { CrewMember } from '@/mocks/crew.mock';
import content from '../content.json';

export function CrewMemberCard({ member, managerName, canManage, onAction }: CrewMemberCardProps) {
  const name = getFullName(member);
  const profileHref = getMemberProfileHref(member.id);

  return (
    <li className='bg-card hover:border-foreground/20 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border p-4 transition-colors sm:px-5 lg:flex-nowrap'>
      <Link
        href={profileHref}
        className='focus-visible:ring-ring/50 group/member -m-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 outline-none focus-visible:ring-3 lg:max-w-72'
      >
        <Avatar className='size-10'>
          <AvatarFallback>{getUserAvatarFallback(member)}</AvatarFallback>
        </Avatar>
        <span className='flex min-w-0 flex-col gap-0.5'>
          <span className='truncate font-semibold underline-offset-4 group-hover/member:underline'>{name}</span>
          <span className='text-muted-foreground truncate text-sm'>
            {content.roles[member.role]} · {member.position}
          </span>
        </span>
      </Link>

      <div className='flex min-w-0 flex-col gap-0.5 text-sm max-lg:order-last max-lg:w-full lg:flex-1'>
        <span className={member.projects.length > 0 ? 'truncate' : 'text-muted-foreground truncate'}>
          {member.projects.length > 0 ? member.projects.join(', ') : content.people.noProjects}
        </span>
        <span className='text-muted-foreground truncate text-xs'>
          {content.people.managerLabel}: {managerName ?? content.people.noManager}
        </span>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <MemberStatusBadge status={member.status} />
        <Button
          variant='outline'
          aria-label={formatText(content.people.openLabel, { name })}
          render={<Link href={profileHref} />}
          nativeButton={false}
        >
          {content.people.open}
        </Button>
        {canManage ? <MemberActionsMenu member={member} name={name} onAction={onAction} /> : null}
      </div>
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
