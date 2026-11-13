import { PageHeader } from '@components/common/page-header/page-header';
import { CrewWorkspace } from '@components/crew/crew-workspace/crew-workspace';
import { InviteMemberDialog } from '@components/crew/invite-member-dialog/invite-member-dialog';
import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';
import { getCrewPermissions } from '@/lib/crew';
import content from './content.json';

export default async function CrewPage() {
  // staff are turned away by the route guard (ROLE_RESTRICTED_ROUTES)
  const profile = await requireRouteAccess(ROUTES.CREW);
  const permissions = getCrewPermissions(profile.role);

  return (
    <>
      <PageHeader title={content.title} actions={permissions.canInvite ? <InviteMemberDialog /> : null} />
      <CrewWorkspace viewer={{ id: profile.id, role: profile.role }} />
    </>
  );
}
