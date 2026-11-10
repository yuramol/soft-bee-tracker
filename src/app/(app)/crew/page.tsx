import { redirect } from 'next/navigation';

import { PageHeader } from '@components/common/page-header/page-header';
import { CrewWorkspace } from '@components/crew/crew-workspace/crew-workspace';
import { InviteMemberDialog } from '@components/crew/invite-member-dialog/invite-member-dialog';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';
import { getCrewPermissions } from '@/lib/crew';
import content from './content.json';

export default async function CrewPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  const permissions = getCrewPermissions(profile.role);

  // Staff only need their own profile, which lives under the avatar menu
  if (!permissions.canViewCrew) {
    redirect(ROUTES.PROFILE);
  }

  return (
    <>
      <PageHeader title={content.title} actions={permissions.canInvite ? <InviteMemberDialog /> : null} />
      <CrewWorkspace viewer={{ id: profile.id, role: profile.role }} />
    </>
  );
}
