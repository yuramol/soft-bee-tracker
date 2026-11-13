'use client';

import { format } from 'date-fns';
import { XIcon } from 'lucide-react';

import { ErrorState } from '@components/common/error-state/error-state';
import { formatDayCount } from '@components/tracker/format-day-count';
import { RequestLeaveDialog } from '@components/tracker/request-leave-dialog/request-leave-dialog';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import {
  useCancelLeaveRequest,
  useCreateLeaveRequest,
  type CreateLeaveRequestInput,
  type LeaveAllowance,
  type LeaveRequest,
  type LeaveStatus
} from '@/lib/api/leave';
import { formatText } from '@/lib/format-text';
import { computeLeaveBalances, countLeaveWorkingDays, formatLeaveDateRange, LEAVE_TYPES, type LeaveBalance } from '@/lib/leave-days';
import type { LeaveRequestFormValues } from '@/lib/schemas/leave-request-form.schema';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function LeavePanel({ requests, allowances, today, isLoading, error, onRetry }: LeavePanelProps) {
  const createLeaveRequest = useCreateLeaveRequest();

  async function handleRequestLeave(values: LeaveRequestFormValues) {
    await createLeaveRequest.mutateAsync(mapFormValuesToInput(values));
  }

  return (
    <section aria-label={content.leave.label} className='bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5'>
      <RequestLeaveDialog onSubmit={handleRequestLeave} />

      {isLoading ? <LeavePanelSkeleton /> : null}
      {!isLoading && error ? <ErrorState error={error} title={content.leave.loadError} onRetry={onRetry} className='py-6' /> : null}
      {!isLoading && !error ? <LeaveOverview requests={requests} allowances={allowances} today={today} /> : null}
    </section>
  );
}

function LeaveOverview({ requests, allowances, today }: LeaveOverviewProps) {
  const balances = computeLeaveBalances(allowances, requests, today.getFullYear());
  const todayKey = format(today, 'yyyy-MM-dd');
  const openRequests = requests
    .filter((request) => request.status === 'pending' || (request.status === 'approved' && request.endDate >= todayKey))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <>
      <dl className='flex flex-col gap-3'>
        {LEAVE_TYPES.map((leaveType) => (
          <BalanceRow key={leaveType} label={content.leave.balances[leaveType]} balance={balances[leaveType]} />
        ))}
      </dl>

      {openRequests.length > 0 ? (
        <div className='flex flex-col gap-2 border-t pt-4'>
          <h3 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>{content.leave.requestsTitle}</h3>
          <ul className='flex flex-col gap-2'>
            {openRequests.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function BalanceRow({ label, balance }: BalanceRowProps) {
  const hints = [
    balance.allowanceDays === null
      ? null
      : formatText(content.leave.balanceHint, { used: balance.usedDays, total: formatDayCount(balance.allowanceDays) }),
    balance.pendingDays > 0 ? formatText(content.leave.pendingHint, { count: formatDayCount(balance.pendingDays) }) : null
  ].filter(Boolean);

  return (
    <div className='flex items-start justify-between gap-3'>
      <dt className='flex flex-col gap-0.5'>
        <span className='text-sm'>{label}</span>
        {hints.length > 0 ? <span className='text-muted-foreground text-xs'>{hints.join(' · ')}</span> : null}
      </dt>
      <dd className='text-right'>
        {balance.remainingDays === null ? (
          <span className='text-muted-foreground text-sm'>{content.leave.notConfigured}</span>
        ) : (
          <span className='font-semibold tabular-nums'>{formatDayCount(balance.remainingDays)}</span>
        )}
      </dd>
    </div>
  );
}

function RequestRow({ request }: { request: LeaveRequest }) {
  const cancelLeaveRequest = useCancelLeaveRequest();
  const days = countLeaveWorkingDays(request.startDate, request.endDate);
  const label = formatText(content.leave.cancelRequest, {
    type: content.leave.types[request.leaveType],
    dates: formatLeaveDateRange(request.startDate, request.endDate)
  });

  function handleCancelClick() {
    cancelLeaveRequest.mutate(request.id);
  }

  return (
    <li className='bg-muted/50 flex items-center justify-between gap-3 rounded-xl px-3 py-2'>
      <div className='flex min-w-0 flex-col'>
        <span className='truncate text-sm font-medium'>{content.leave.types[request.leaveType]}</span>
        <span className='text-muted-foreground text-xs'>
          {formatLeaveDateRange(request.startDate, request.endDate)} · {formatDayCount(days)}
        </span>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{content.leave.status[request.status]}</Badge>
        {request.status === 'pending' ? (
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            title={label}
            disabled={cancelLeaveRequest.isPending}
            onClick={handleCancelClick}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function LeavePanelSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden>
      <Skeleton className='h-5 w-full' />
      <Skeleton className='h-5 w-4/5' />
    </div>
  );
}

function mapFormValuesToInput(values: LeaveRequestFormValues): CreateLeaveRequestInput {
  return {
    leaveType: values.leaveType,
    startDate: values.startDate,
    endDate: values.endDate,
    note: values.note.trim() || null
  };
}

const STATUS_BADGE_VARIANT: Record<LeaveStatus, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'secondary'
};

interface LeavePanelProps {
  requests: LeaveRequest[];
  allowances: LeaveAllowance[];
  today: Date;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

interface LeaveOverviewProps {
  requests: LeaveRequest[];
  allowances: LeaveAllowance[];
  today: Date;
}

interface BalanceRowProps {
  label: string;
  balance: LeaveBalance;
}
