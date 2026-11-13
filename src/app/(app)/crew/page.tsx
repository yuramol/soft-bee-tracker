import { PageHeader } from '@components/common/page-header/page-header';
import { CrewWorkspace } from '@components/crew/crew-workspace/crew-workspace';
import { InviteMemberDialog } from '@components/crew/invite-member-dialog/invite-member-dialog';
import { ROUTES } from '@/constants';
import { getRouteSession, requireRouteAccess } from '@/lib/api/auth/server';
import { getInvitableRoles } from '@/lib/api/invites';
import content from './content.json';

export default async function CrewPage() {
  // staff are turned away by the route guard (ROLE_RESTRICTED_ROUTES)
  const profile = await requireRouteAccess(ROUTES.CREW);
  // same cached claim requireRouteAccess just checked; picker options only, the
  // server action re-checks the inviter on every call
  const session = await getRouteSession();
  const invitableRoles = getInvitableRoles(session?.role ?? null);
  const inviteAction = invitableRoles.length > 0 ? <InviteMemberDialog invitableRoles={invitableRoles} /> : null;

  return (
    <>
      <PageHeader title={content.title} actions={inviteAction} />
      <CrewWorkspace viewer={{ id: profile.id, role: profile.role }} />
    </>
  );
}
