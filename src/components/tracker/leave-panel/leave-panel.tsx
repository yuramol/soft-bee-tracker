import { format, parseISO } from 'date-fns';

import { formatDayCount } from '@components/tracker/format-day-count';
import { RequestLeaveDialog } from '@components/tracker/request-leave-dialog/request-leave-dialog';
import { Badge } from '@ui/badge';
import { formatText } from '@/lib/format-text';
import { computeLeaveBalances, countLeaveWorkingDays, LEAVE_TYPES, type LeaveBalance } from '@/lib/leave-days';
import type { LeaveRequest, LeaveStatus, LeaveAllowance } from '@/mocks/leave.mock';
import content from '../content.json';

export function LeavePanel({ requests, allowances, today }: LeavePanelProps) {
  const balances = computeLeaveBalances(allowances, requests, today.getFullYear());
  const todayKey = format(today, 'yyyy-MM-dd');
  const openRequests = requests
    .filter((request) => request.status === 'pending' || (request.status === 'approved' && request.endDate >= todayKey))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <section aria-label={content.leave.label} className='bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5'>
      <RequestLeaveDialog />

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

      <p className='text-muted-foreground text-xs'>{content.leave.mockNotice}</p>
    </section>
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
  const days = countLeaveWorkingDays(request.startDate, request.endDate);

  return (
    <li className='bg-muted/50 flex items-center justify-between gap-3 rounded-xl px-3 py-2'>
      <div className='flex min-w-0 flex-col'>
        <span className='truncate text-sm font-medium'>{content.leave.types[request.leaveType]}</span>
        <span className='text-muted-foreground text-xs'>
          {formatDateRange(request.startDate, request.endDate)} · {formatDayCount(days)}
        </span>
      </div>
      <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{content.leave.status[request.status]}</Badge>
    </li>
  );
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);

  if (startDate === endDate) {
    return format(start, 'd MMM');
  }

  return `${format(start, 'd MMM')} – ${format(parseISO(endDate), 'd MMM')}`;
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
}

interface BalanceRowProps {
  label: string;
  balance: LeaveBalance;
}
