'use client';

import { useUserProjectsList } from '@/hooks/use-user-projects-list';

export function UserProjectsList() {
  const { userProjects, isLoading, error } = useUserProjectsList();

  if (isLoading) {
    return <p className='text-muted-foreground text-sm'>Loading projects…</p>;
  }

  if (error) {
    return (
      <p role='alert' className='text-destructive text-sm'>
        {error.message}
      </p>
    );
  }

  if (userProjects.length === 0) {
    return <p className='text-muted-foreground text-sm'>No user projects found.</p>;
  }

  return null;
}
