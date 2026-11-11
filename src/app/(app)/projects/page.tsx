import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ProjectsPageSkeleton } from '@components/projects/projects-skeleton';
import { ProjectsWorkspace } from '@components/projects/projects-workspace/projects-workspace';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';

export default async function ProjectsPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <Suspense fallback={<ProjectsPageSkeleton />}>
      <ProjectsWorkspace role={profile.role} />
    </Suspense>
  );
}
