import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { MemberProfile } from '@components/crew/member-profile/member-profile';
import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';
import { canViewCrewMember } from '@/lib/api/crew/server';
import { getCrewPermissions } from '@/lib/crew';
import content from './content.json';

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { id } = await params;
  // dynamic route: the guard gets the real path so login sends the user back here
  const profile = await requireRouteAccess(`${ROUTES.PROFILE}/${encodeURIComponent(id)}`);

  if (id === profile.id) {
    redirect(ROUTES.PROFILE);
  }

  const permissions = getCrewPermissions(profile.role);

  if (!permissions.canViewCrew) {
    redirect(ROUTES.PROFILE);
  }

  // same scope as the Crew list: rls only returns people this viewer may see
  if (!(await canViewCrewMember(id))) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-6'>
      <Link
        href={ROUTES.CREW}
        className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-fit items-center gap-1.5 rounded-md text-sm outline-none focus-visible:ring-3'
      >
        <ArrowLeftIcon className='size-4' />
        {content.backToCrew}
      </Link>
      <MemberProfile
        memberId={id}
        viewer={{ id: profile.id, role: profile.role }}
        canReviewLeave={permissions.canReviewLeave}
        // employment details are admin-only, the same gate as role changes and blocking
        canEditEmployment={permissions.canManageMembers}
      />
    </div>
  );
}

interface MemberProfilePageProps {
  params: Promise<{ id: string }>;
}
