'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSignOut } from '@/lib/api/auth';
import { ROUTES } from '@/constants';
import { useRouter } from 'next/navigation';

interface AvatarDropdownProps {
  avatarUrl?: string;
  fallback: string;
}

export function AvatarDropdown({ avatarUrl, fallback }: AvatarDropdownProps) {
  const router = useRouter();

  const { mutate, isPending } = useSignOut({
    onSuccess: () => {
      router.push(ROUTES.LOGIN);
      router.refresh();
    }
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost' size='icon' className='rounded-full'>
            <Avatar>
              <AvatarImage src={avatarUrl} alt='shadcn' />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className='w-32'>
        <DropdownMenuGroup>
          <Link href={ROUTES.PROFILE}>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant='destructive' onClick={() => mutate()} disabled={isPending}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
