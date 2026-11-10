'use client';

import { CheckIcon, PalmtreeIcon, XIcon } from 'lucide-react';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { LeaveNote } from '@components/crew/leave-note';
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
    <li className='bg-card flex flex-col gap-3 rounded-2xl border p-4 sm:px-5'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <Avatar className='size-10 shrink-0'>
            <AvatarFallback>{getUserAvatarFallback(member)}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col gap-0.5'>
            <span className='font-semibold break-words'>{getFullName(member)}</span>
            <span className='text-muted-foreground text-sm break-words'>
              {content.leave.types[request.leaveType]} · {formatLeaveDateRange(request.startDate, request.endDate)} ·{' '}
              {formatText(content.leave.workingDays, { count: days, unit: days === 1 ? content.leave.day : content.leave.days })}
            </span>
          </div>
        </div>
        <LeaveStatusBadge status={request.status} />
      </div>

      {request.note ? <LeaveNote note={request.note} className='sm:ml-13' /> : null}

      {isReviewable ? (
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={handleRejectClick}>
            <XIcon data-icon='inline-start' />
            {content.leave.reject}
          </Button>
          <Button onClick={handleApproveClick}>
            <CheckIcon data-icon='inline-start' />
            {content.leave.approve}
          </Button>
        </div>
      ) : null}
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
