'use client';

import { CheckIcon, PalmtreeIcon, XIcon } from 'lucide-react';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { LeaveStatusBadge } from '@components/crew/leave-status-badge';
import { Avatar, AvatarFallback } from '@ui/avatar';
import { Button } from '@ui/button';
import { getFullName } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import { countLeaveWorkingDays, formatLeaveDateRange } from '@/lib/leave-days';
import { getUserAvatarFallback } from '@/lib/utils';
import type { CrewLeaveRequest, CrewMember } from '@/mocks/crew.mock';
import type { LeaveStatus } from '@/mocks/leave.mock';
import content from '../content.json';

export function CrewLeaveRequests({ requests, membersById, canReview, onReview }: CrewLeaveRequestsProps) {
  if (requests.length === 0) {
    return <EmptyState icon={PalmtreeIcon} title={content.leave.emptyTitle} description={content.leave.emptyDescription} />;
  }

  return (
    <ul className='flex flex-col gap-3'>
      {requests.map((request) => {
        const member = membersById.get(request.memberId);

        return member ? (
          <LeaveRequestRow key={request.id} request={request} member={member} canReview={canReview} onReview={onReview} />
        ) : null;
      })}
    </ul>
  );
}

function LeaveRequestRow({ request, member, canReview, onReview }: LeaveRequestRowProps) {
  const days = countLeaveWorkingDays(request.startDate, request.endDate);
  const isReviewable = canReview && request.status === 'pending';

  function handleApproveClick() {
    onReview(request, 'approved');
  }

  function handleRejectClick() {
    onReview(request, 'rejected');
  }

  return (
    <li className='bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border p-4 sm:px-5 lg:flex-nowrap'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <Avatar className='size-10'>
          <AvatarFallback>{getUserAvatarFallback(member)}</AvatarFallback>
        </Avatar>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <span className='truncate font-semibold'>{getFullName(member)}</span>
          <span className='text-muted-foreground truncate text-sm'>
            {content.leave.types[request.leaveType]} · {formatLeaveDateRange(request.startDate, request.endDate)} ·{' '}
            {formatText(content.leave.workingDays, { count: days, unit: days === 1 ? content.leave.day : content.leave.days })}
          </span>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-2 max-lg:w-full max-lg:justify-end'>
        <LeaveStatusBadge status={request.status} />
        {isReviewable ? (
          <>
            <Button variant='outline' onClick={handleRejectClick}>
              <XIcon data-icon='inline-start' />
              {content.leave.reject}
            </Button>
            <Button onClick={handleApproveClick}>
              <CheckIcon data-icon='inline-start' />
              {content.leave.approve}
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

export type LeaveReviewDecision = Extract<LeaveStatus, 'approved' | 'rejected'>;

interface CrewLeaveRequestsProps {
  requests: CrewLeaveRequest[];
  membersById: Map<string, CrewMember>;
  canReview: boolean;
  onReview: (request: CrewLeaveRequest, decision: LeaveReviewDecision) => void;
}

interface LeaveRequestRowProps {
  request: CrewLeaveRequest;
  member: CrewMember;
  canReview: boolean;
  onReview: (request: CrewLeaveRequest, decision: LeaveReviewDecision) => void;
}
