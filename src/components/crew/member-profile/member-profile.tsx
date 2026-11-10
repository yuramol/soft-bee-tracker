'use client';

import { format, parseISO } from 'date-fns';
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckIcon,
  FolderKanbanIcon,
  GlobeIcon,
  Link2Icon,
  MailIcon,
  PalmtreeIcon,
  PhoneIcon,
  StethoscopeIcon,
  TimerIcon,
  UserRoundIcon,
  XIcon,
  type LucideIcon
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { LeaveStatusBadge } from '@components/crew/leave-status-badge';
import { MemberStatusBadge } from '@components/crew/member-status-badge';
import { RoleBadge } from '@components/crew/role-badge';
import { RequestLeaveDialog } from '@components/tracker/request-leave-dialog/request-leave-dialog';
import { Avatar, AvatarFallback } from '@ui/avatar';
import { Button } from '@ui/button';
import { computeMemberLeaveBalances, getFullName, toSafeExternalUrl } from '@/lib/crew';
import { formatClock } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { countLeaveWorkingDays, formatLeaveDateRange, LEAVE_TYPES, type LeaveBalance } from '@/lib/leave-days';
import type { LeaveRequestFormValues } from '@/lib/schemas/leave-request-form.schema';
import { getUserAvatarFallback } from '@/lib/utils';
import { MOCK_CREW_LEAVE_ALLOWANCES, type CrewLeaveRequest, type CrewMember } from '@/mocks/crew.mock';
import type { LeaveType } from '@/mocks/leave.mock';
import content from '../content.json';

export function MemberProfile({ member, managerName, initialLeaveRequests, canReviewLeave }: MemberProfileProps) {
  const [leaveRequests, setLeaveRequests] = useState<CrewLeaveRequest[]>(initialLeaveRequests);
  const [year] = useState(() => new Date().getFullYear());
  const name = getFullName(member);
  const balances = computeMemberLeaveBalances(leaveRequests, MOCK_CREW_LEAVE_ALLOWANCES, year);

  function handleGrantLeave(values: LeaveRequestFormValues) {
    setLeaveRequests((current) => [
      ...current,
      {
        id: `granted-${Date.now()}`,
        memberId: member.id,
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        status: 'approved'
      }
    ]);
    toast.success(formatText(content.profile.granted, { name }));
  }

  function handleReview(request: CrewLeaveRequest, decision: 'approved' | 'rejected') {
    setLeaveRequests((current) => current.map((item) => (item.id === request.id ? { ...item, status: decision } : item)));
    toast.success(formatText(decision === 'approved' ? content.leave.approved : content.leave.rejected, { name }));
  }

  return (
    <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-12 xl:grid-cols-[minmax(0,1fr)_24rem]'>
      <section aria-label={content.profile.detailsLabel} className='bg-card flex flex-col gap-6 rounded-2xl border p-5 sm:p-8'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-center'>
          <Avatar className='size-24 sm:size-28'>
            <AvatarFallback className='text-3xl font-semibold'>{getUserAvatarFallback(member)}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col gap-2'>
            <h1 className='truncate text-2xl font-semibold tracking-tight sm:text-3xl'>{name}</h1>
            <p className='text-muted-foreground'>{member.position}</p>
            <div className='flex flex-wrap gap-2'>
              <RoleBadge role={member.role} />
              <MemberStatusBadge status={member.status} />
            </div>
          </div>
        </div>

        {member.status === 'pending' ? (
          <p className='bg-warning/10 text-warning rounded-xl px-4 py-3 text-sm'>{content.profile.pendingHint}</p>
        ) : null}

        <dl className='grid gap-x-8 gap-y-5 border-t pt-6 sm:grid-cols-2'>
          <DetailRow icon={BriefcaseIcon} label={content.profile.position}>
            {member.position}
          </DetailRow>
          <DetailRow icon={UserRoundIcon} label={content.profile.manager}>
            {managerName ?? <NotAdded />}
          </DetailRow>
          <DetailRow icon={FolderKanbanIcon} label={content.profile.projects}>
            {member.projects.length > 0 ? member.projects.join(', ') : content.people.noProjects}
          </DetailRow>
          <DetailRow icon={TimerIcon} label={content.profile.monthTime}>
            <span className='font-semibold tabular-nums'>{formatClock(member.monthMinutes)}</span>
          </DetailRow>
          <DetailRow icon={MailIcon} label={content.profile.email}>
            <ContactLink href={`mailto:${member.email}`}>{member.email}</ContactLink>
          </DetailRow>
          <DetailRow icon={PhoneIcon} label={content.profile.phone}>
            {member.phone ? <ContactLink href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}>{member.phone}</ContactLink> : <NotAdded />}
          </DetailRow>
          <DetailRow icon={Link2Icon} label={content.profile.linkedin}>
            <ExternalLink url={member.linkedin} label={content.profile.linkedin} />
          </DetailRow>
          <DetailRow icon={GlobeIcon} label={content.profile.upwork}>
            <ExternalLink url={member.upwork} label={content.profile.upwork} />
          </DetailRow>
          <DetailRow icon={CalendarDaysIcon} label={content.profile.employmentDate}>
            {member.employmentDate ? format(parseISO(member.employmentDate), 'd MMMM yyyy') : <NotAdded />}
          </DetailRow>
        </dl>
      </section>

      <aside
        aria-label={content.profile.leaveLabel}
        className='bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5 lg:sticky lg:top-20'
      >
        {canReviewLeave ? <RequestLeaveDialog mode='grant' onSubmit={handleGrantLeave} /> : null}

        <dl className='flex flex-col gap-3'>
          {LEAVE_TYPES.map((leaveType) => (
            <BalanceRow key={leaveType} leaveType={leaveType} balance={balances[leaveType]} />
          ))}
        </dl>

        <div className='flex flex-col gap-2 border-t pt-4'>
          <h2 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>{content.profile.requestsTitle}</h2>
          {leaveRequests.length > 0 ? (
            <ul className='flex flex-col gap-2'>
              {[...leaveRequests]
                .sort((a, b) => b.startDate.localeCompare(a.startDate))
                .map((request) => (
                  <LeaveRequestItem key={request.id} request={request} canReview={canReviewLeave} onReview={handleReview} />
                ))}
            </ul>
          ) : (
            <p className='text-muted-foreground text-sm'>{content.profile.noRequests}</p>
          )}
        </div>

        <p className='text-muted-foreground text-xs'>{content.mockNotice}</p>
      </aside>
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className='flex items-start gap-3'>
      <span className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'>
        <Icon className='size-4' />
      </span>
      <div className='flex min-w-0 flex-col gap-0.5'>
        <dt className='text-muted-foreground text-xs'>{label}</dt>
        <dd className='text-sm break-words'>{children}</dd>
      </div>
    </div>
  );
}

function ContactLink({ href, children }: ContactLinkProps) {
  return (
    <a href={href} className='text-deep-teal dark:text-electric-green font-medium break-all underline-offset-4 hover:underline'>
      {children}
    </a>
  );
}

function ExternalLink({ url, label }: ExternalLinkProps) {
  const safeUrl = toSafeExternalUrl(url);

  if (!safeUrl) {
    return <NotAdded />;
  }

  return (
    <a
      href={safeUrl}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={formatText(content.profile.openExternal, { label })}
      className='text-deep-teal dark:text-electric-green font-medium break-all underline-offset-4 hover:underline'
    >
      {formatUrlLabel(safeUrl)}
    </a>
  );
}

function NotAdded() {
  return <span className='text-muted-foreground'>{content.profile.notAdded}</span>;
}

function BalanceRow({ leaveType, balance }: BalanceRowProps) {
  const Icon = BALANCE_ICONS[leaveType];

  return (
    <div className='flex items-center justify-between gap-3'>
      <dt className='flex items-center gap-2 text-sm'>
        <Icon className='text-muted-foreground size-4' />
        <span className='flex flex-col'>
          {content.profile.balances[leaveType]}
          {balance.remainingDays !== null ? (
            <span className='text-muted-foreground text-xs'>
              {formatText(content.profile.balanceHint, { remaining: balance.remainingDays })}
            </span>
          ) : null}
        </span>
      </dt>
      <dd className='font-semibold tabular-nums'>
        {balance.allowanceDays === null ? (
          <span className='text-muted-foreground text-sm font-normal'>{content.profile.notConfigured}</span>
        ) : (
          formatText(content.profile.balanceValue, { used: balance.usedDays, total: balance.allowanceDays })
        )}
      </dd>
    </div>
  );
}

function LeaveRequestItem({ request, canReview, onReview }: LeaveRequestItemProps) {
  const days = countLeaveWorkingDays(request.startDate, request.endDate);
  const isReviewable = canReview && request.status === 'pending';

  function handleApproveClick() {
    onReview(request, 'approved');
  }

  function handleRejectClick() {
    onReview(request, 'rejected');
  }

  return (
    <li className='bg-muted/50 flex flex-col gap-2 rounded-xl px-3 py-2'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 flex-col'>
          <span className='truncate text-sm font-medium'>{content.leave.types[request.leaveType]}</span>
          <span className='text-muted-foreground text-xs'>
            {formatLeaveDateRange(request.startDate, request.endDate)} ·{' '}
            {formatText(content.leave.workingDays, { count: days, unit: days === 1 ? content.leave.day : content.leave.days })}
          </span>
        </div>
        <LeaveStatusBadge status={request.status} />
      </div>
      {isReviewable ? (
        <div className='flex justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={handleRejectClick}>
            <XIcon data-icon='inline-start' />
            {content.leave.reject}
          </Button>
          <Button size='sm' onClick={handleApproveClick}>
            <CheckIcon data-icon='inline-start' />
            {content.leave.approve}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function formatUrlLabel(url: string): string {
  const { host, pathname } = new URL(url);

  return `${host.replace(/^www\./, '')}${pathname.replace(/\/$/, '')}`;
}

const BALANCE_ICONS: Record<LeaveType, LucideIcon> = {
  vacation: PalmtreeIcon,
  sick_leave: StethoscopeIcon
};

interface MemberProfileProps {
  member: CrewMember;
  managerName: string | null;
  initialLeaveRequests: CrewLeaveRequest[];
  canReviewLeave: boolean;
}

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

interface ContactLinkProps {
  href: string;
  children: ReactNode;
}

interface ExternalLinkProps {
  url: string | null;
  label: string;
}

interface BalanceRowProps {
  leaveType: LeaveType;
  balance: LeaveBalance;
}

interface LeaveRequestItemProps {
  request: CrewLeaveRequest;
  canReview: boolean;
  onReview: (request: CrewLeaveRequest, decision: 'approved' | 'rejected') => void;
}
