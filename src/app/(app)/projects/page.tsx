import { Suspense } from 'react';

import { ProjectsPageSkeleton } from '@components/projects/projects-skeleton';
import { ProjectsWorkspace } from '@components/projects/projects-workspace/projects-workspace';
import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';

export default async function ProjectsPage() {
  const profile = await requireRouteAccess(ROUTES.PROJECTS);

  return (
    <Suspense fallback={<ProjectsPageSkeleton />}>
      <ProjectsWorkspace role={profile.role} />
    </Suspense>
  );
}
