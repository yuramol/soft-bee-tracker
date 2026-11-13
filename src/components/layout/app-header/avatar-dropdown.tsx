'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOutIcon, UserIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/dropdown-menu';
import { ROUTES } from '@/constants';
import { useSignOut } from '@/lib/api/auth';
import type { UserProfile } from '@/lib/api/auth';
import { getUserAvatarFallback } from '@/lib/utils';
import content from '../content.json';

interface AvatarDropdownProps {
  profile: UserProfile;
}

export function AvatarDropdown({ profile }: AvatarDropdownProps) {
  const router = useRouter();

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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost' size='icon' className='rounded-full' aria-label={content.accountMenu.openLabel}>
            <UserAvatar profile={profile} displayName={displayName} />
          </Button>
        }
      />
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='p-0 font-normal'>
            <div className='flex items-center gap-2 px-1 py-1.5 text-sm'>
              <UserAvatar profile={profile} displayName={displayName} />
              <div className='grid flex-1 text-left leading-tight'>
                <span className='text-foreground truncate font-medium'>{displayName}</span>
                <span className='truncate text-xs'>{profile.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={ROUTES.PROFILE} />}>
            <UserIcon />
            {content.accountMenu.profile}
          </DropdownMenuItem>
          <DropdownMenuItem variant='destructive' disabled={signOut.isPending} onClick={handleSignOutClick}>
            <LogOutIcon />
            {content.accountMenu.logOut}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserAvatar({ profile, displayName }: UserAvatarProps) {
  return (
    <Avatar>
      {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={displayName} /> : null}
      <AvatarFallback>{getUserAvatarFallback(profile)}</AvatarFallback>
    </Avatar>
  );
}

function buildDisplayName(profile: UserProfile): string {
  return `${profile.firstName} ${profile.lastName}`.trim() || profile.username;
}

interface UserAvatarProps {
  profile: UserProfile;
  displayName: string;
}
