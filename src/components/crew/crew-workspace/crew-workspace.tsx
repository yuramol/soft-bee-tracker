'use client';

import { UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { EmptyState } from '@components/common/empty-state/empty-state';
import { ChangeRoleDialog } from '@components/crew/change-role-dialog/change-role-dialog';
import { CrewFilters } from '@components/crew/crew-filters/crew-filters';
import { CrewLeaveRequests, type LeaveReviewDecision } from '@components/crew/crew-leave-requests/crew-leave-requests';
import { CrewMemberCard, type MemberActionType } from '@components/crew/crew-member-card/crew-member-card';
import { TeamSummary } from '@components/crew/team-summary/team-summary';
import { Badge } from '@ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import type { UserRole } from '@/lib/api/auth';
import {
  countPendingLeave,
  DEFAULT_CREW_FILTERS,
  filterMembers,
  getCrewPermissions,
  getFullName,
  getPositions,
  getVisibleLeaveRequests,
  getVisibleMembers,
  summarizeTeamTime,
  type CrewFilters as CrewFiltersValue
} from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import { buildTeamReportHref } from '@/lib/team-report-params';
import {
  getMockViewerId,
  MOCK_CREW,
  MOCK_CREW_LEAVE_REQUESTS,
  type CrewLeaveRequest,
  type CrewMember,
  type CrewViewer
} from '@/mocks/crew.mock';
import content from '../content.json';

export function CrewWorkspace({ viewer }: CrewWorkspaceProps) {
  const [members, setMembers] = useState<CrewMember[]>(MOCK_CREW);
  const [leaveRequests, setLeaveRequests] = useState<CrewLeaveRequest[]>(MOCK_CREW_LEAVE_REQUESTS);
  const [filters, setFilters] = useState<CrewFiltersValue>(DEFAULT_CREW_FILTERS);
  const [tab, setTab] = useState<CrewTab>('people');
  const [pendingAction, setPendingAction] = useState<PendingMemberAction | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [today] = useState(() => new Date());

  const permissions = getCrewPermissions(viewer.role);
  const visibleMembers = getVisibleMembers(members, { id: getMockViewerId(viewer), role: viewer.role });
  const filteredMembers = filterMembers(visibleMembers, filters);
  const membersById = new Map(members.map((member) => [member.id, member]));
  const visibleLeaveRequests = getVisibleLeaveRequests(leaveRequests, visibleMembers);
  const pendingLeaveCount = countPendingLeave(visibleLeaveRequests);
  const reportHref = buildTeamReportHref({
    period: 'this-week',
    memberIds: filteredMembers.length === members.length ? [] : filteredMembers.map((member) => member.id)
  });

  function getManagerName(member: CrewMember): string | null {
    const manager = member.managerId ? membersById.get(member.managerId) : undefined;

    return manager ? getFullName(manager) : null;
  }

  function handleTabChange(value: string | number | null) {
    if (value === 'people' || value === 'leave') {
      setTab(value);
    }
  }

  function handleMemberAction(type: MemberActionType, member: CrewMember) {
    setPendingAction({ type, member, openedAt: Date.now() });
    setIsActionDialogOpen(true);
  }

  function updateMember(memberId: string, changes: Partial<CrewMember>) {
    setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, ...changes } : member)));
  }

  function handleRoleConfirm(member: CrewMember, role: UserRole) {
    updateMember(member.id, { role });
    setIsActionDialogOpen(false);
    toast.success(formatText(content.actions.roleChanged, { name: getFullName(member), role: content.roles[role] }));
  }

  function handleAccessConfirm() {
    if (!pendingAction) {
      return;
    }

    const { type, member } = pendingAction;
    const isBlocking = type === 'block';

    updateMember(member.id, { status: isBlocking ? 'blocked' : 'active' });
    setIsActionDialogOpen(false);
    toast.success(formatText(isBlocking ? content.actions.blocked : content.actions.reactivated, { name: getFullName(member) }));
  }

  function handleLeaveReview(request: CrewLeaveRequest, decision: LeaveReviewDecision) {
    const member = membersById.get(request.memberId);

    setLeaveRequests((current) => current.map((item) => (item.id === request.id ? { ...item, status: decision } : item)));
    toast.success(
      formatText(decision === 'approved' ? content.leave.approved : content.leave.rejected, { name: member ? getFullName(member) : '' })
    );
  }

  return (
    <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-12 xl:grid-cols-[minmax(0,1fr)_24rem]'>
      <Tabs value={tab} onValueChange={handleTabChange} className='min-w-0 gap-5'>
        <TabsList aria-label={content.tabs.label}>
          <TabsTrigger value='people'>{content.tabs.people}</TabsTrigger>
          <TabsTrigger value='leave'>
            {content.tabs.leave}
            {pendingLeaveCount > 0 ? (
              <Badge
                variant='warning'
                className='ml-1 tabular-nums'
                aria-label={formatText(content.tabs.pendingCount, { count: pendingLeaveCount })}
              >
                {pendingLeaveCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='people' className='flex flex-col gap-5'>
          <CrewFilters filters={filters} positions={getPositions(visibleMembers)} onChange={setFilters} />

          <p className='text-muted-foreground text-sm'>{formatText(content.people.count, { count: filteredMembers.length })}</p>

          {filteredMembers.length > 0 ? (
            <ul className='flex flex-col gap-3'>
              {filteredMembers.map((member) => (
                <CrewMemberCard
                  key={member.id}
                  member={member}
                  managerName={getManagerName(member)}
                  canManage={permissions.canManageMembers}
                  onAction={handleMemberAction}
                />
              ))}
            </ul>
          ) : (
            <EmptyState icon={UsersIcon} title={content.people.emptyTitle} description={content.people.emptyDescription} />
          )}
        </TabsContent>

        <TabsContent value='leave'>
          <CrewLeaveRequests
            requests={visibleLeaveRequests}
            membersById={membersById}
            canReview={permissions.canReviewLeave}
            onReview={handleLeaveReview}
          />
        </TabsContent>
      </Tabs>

      <aside className='flex flex-col gap-3 max-lg:order-first lg:sticky lg:top-20'>
        <TeamSummary
          summary={summarizeTeamTime(filteredMembers)}
          peopleCount={filteredMembers.length}
          today={today}
          reportHref={reportHref}
        />
        <p className='text-muted-foreground px-1 text-xs'>{content.mockNotice}</p>
      </aside>

      {pendingAction?.type === 'role' ? (
        <ChangeRoleDialog
          key={pendingAction.openedAt}
          member={pendingAction.member}
          open={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          onConfirm={handleRoleConfirm}
        />
      ) : null}

      {pendingAction && pendingAction.type !== 'role' ? (
        <ConfirmDialog
          open={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          {...getAccessDialogCopy(pendingAction.type, pendingAction.member)}
          onConfirm={handleAccessConfirm}
        />
      ) : null}
    </div>
  );
}

function getAccessDialogCopy(type: Exclude<MemberActionType, 'role'>, member: CrewMember) {
  const name = getFullName(member);
  const copy = type === 'block' ? content.actions.blockDialog : content.actions.reactivateDialog;

  return {
    title: formatText(copy.title, { name }),
    description: formatText(copy.description, { name }),
    confirmLabel: copy.confirmButton,
    isDestructive: type === 'block'
  };
}

type CrewTab = 'people' | 'leave';

interface PendingMemberAction {
  type: MemberActionType;
  member: CrewMember;
  openedAt: number;
}

interface CrewWorkspaceProps {
  viewer: CrewViewer;
}
