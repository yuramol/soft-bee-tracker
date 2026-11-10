import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { MemberProfile } from '@components/crew/member-profile/member-profile';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';
import { getCrewPermissions, getFullName, getVisibleMembers } from '@/lib/crew';
import { getMockViewerId, MOCK_CREW, MOCK_CREW_LEAVE_REQUESTS } from '@/mocks/crew.mock';
import content from './content.json';

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const [{ id }, profile] = await Promise.all([params, getSessionProfile()]);

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  if (id === profile.id) {
    redirect(ROUTES.PROFILE);
  }

  const permissions = getCrewPermissions(profile.role);

  if (!permissions.canViewCrew) {
    redirect(ROUTES.PROFILE);
  }

  // Same access scope as the Crew list, so a manager can't open people outside their team by URL
  const visibleMembers = getVisibleMembers(MOCK_CREW, { id: getMockViewerId(profile), role: profile.role });
  const member = visibleMembers.find((item) => item.id === id);

  if (!member) {
    notFound();
  }

  const manager = member.managerId ? MOCK_CREW.find((item) => item.id === member.managerId) : undefined;

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
        member={member}
        managerName={manager ? getFullName(manager) : null}
        initialLeaveRequests={MOCK_CREW_LEAVE_REQUESTS.filter((request) => request.memberId === member.id)}
        canReviewLeave={permissions.canReviewLeave}
      />
    </div>
  );
}

interface MemberProfilePageProps {
  params: Promise<{ id: string }>;
}
