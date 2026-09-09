'use client';

import { useUserProjectsList } from '@/hooks/use-user-projects-list';
import type { Project } from '@/lib/api/projects';

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

  return (
    <ul className='divide-border divide-y rounded-lg border text-left'>
      {userProjects.map((project) => (
        <UserProjectListItem key={project.id} project={project} />
      ))}
    </ul>
  );
}

function UserProjectListItem({ project }: { project: Project }) {
  return (
    <li className='flex flex-col gap-1 px-4 py-3'>
      <span className='font-medium'>{project.name}</span>
      <span className='text-muted-foreground text-sm'>
        {project.client} · {formatProjectType(project.type)} · {project.status}
      </span>
    </li>
  );
}

function formatProjectType(type: Project['type']): string {
  switch (type) {
    case 'time_material':
      return 'Time and material';
    case 'fixed_price':
      return 'Fixed price';
    case 'non_profit':
      return 'Non-profit';
  }
}
