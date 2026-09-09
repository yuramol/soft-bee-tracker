'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@ui/sidebar';
import { ROUTES } from '@/constants';
import { getUserAvatarFallback } from '@/lib/utils';
import { useSignOut } from '@/lib/api/auth';
import type { UserProfile } from '@/lib/api/auth';

interface NavUserProps {
  profile: UserProfile;
}

export function NavUser({ profile }: NavUserProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const signOut = useSignOut({
    onSuccess: () => {
      router.push(ROUTES.LOGIN);
      router.refresh();
    }
  });

  function handleSignOutClick() {
    signOut.mutate();
  }

  const displayName = buildDisplayName(profile);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size='lg' className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground' />
            }
          >
            <UserAvatar profile={profile} />
            <div className='grid flex-1 text-left leading-tight'>
              <span className='truncate font-medium'>{displayName}</span>
              <span className='text-muted-foreground truncate text-xs'>{profile.email}</span>
            </div>
            <ChevronsUpDownIcon className='ml-auto' />
          </DropdownMenuTrigger>

          <DropdownMenuContent className='min-w-56 rounded-lg' align='end' side={isMobile ? 'bottom' : 'right'} sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-sm'>
                  <UserAvatar profile={profile} />
                  <div className='grid flex-1 text-left leading-tight'>
                    <span className='text-foreground truncate font-medium'>{displayName}</span>
                    <span className='truncate text-xs'>{profile.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem render={<Link href={ROUTES.PROFILE} />}>
              <UserIcon />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem variant='destructive' disabled={signOut.isPending} onClick={handleSignOutClick}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function UserAvatar({ profile }: NavUserProps) {
  return (
    <Avatar className='size-8 rounded-lg'>
      {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={buildDisplayName(profile)} /> : null}
      <AvatarFallback>{getUserAvatarFallback(profile)}</AvatarFallback>
    </Avatar>
  );
}

function buildDisplayName(profile: UserProfile): string {
  return `${profile.firstName} ${profile.lastName}`.trim() || profile.username;
}
