import { format, parseISO } from 'date-fns';
import { BriefcaseIcon, CalendarDaysIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { MemberStatusBadge } from '@components/crew/member-status-badge';
import { RoleBadge } from '@components/crew/role-badge';
import { ChangePasswordDialog } from '@components/profile/change-password-dialog/change-password-dialog';
import { ChangePhotoDialog } from '@components/profile/change-photo-dialog/change-photo-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import type { UserProfile } from '@/lib/api/auth';
import { getProfileDisplayName, getProfilePosition, getProfileStatus } from '@/lib/profile';
import { getUserAvatarFallback } from '@/lib/utils';
import content from '../content.json';

export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  const name = getProfileDisplayName(profile);
  const status = getProfileStatus(profile);
  const position = getProfilePosition(profile);

  return (
    <section aria-label={content.summary.label} className='bg-card flex flex-col gap-6 rounded-2xl border p-5 sm:p-6 lg:sticky lg:top-20'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <Avatar className='size-24 sm:size-28'>
          {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={name} /> : null}
          <AvatarFallback className='text-3xl font-semibold'>{getUserAvatarFallback(profile)}</AvatarFallback>
        </Avatar>
        <ChangePhotoDialog profile={profile} />
        <div className='flex min-w-0 flex-col items-center gap-2'>
          <h2 className='text-xl font-semibold tracking-tight break-words'>{name}</h2>
          <p className='text-muted-foreground text-sm break-all'>@{profile.username}</p>
          <div className='flex flex-wrap justify-center gap-2'>
            <RoleBadge role={profile.role} />
            <MemberStatusBadge status={status} />
          </div>
        </div>
      </div>

      {status === 'pending' ? (
        <p className='bg-warning/10 text-warning rounded-xl px-4 py-3 text-sm'>{content.summary.pendingHint}</p>
      ) : null}

      <dl className='flex flex-col gap-4 border-t pt-5'>
        <SummaryRow icon={BriefcaseIcon} label={content.summary.position}>
          {position ?? <span className='text-muted-foreground'>{content.summary.noPosition}</span>}
        </SummaryRow>
        <SummaryRow icon={CalendarDaysIcon} label={content.summary.employedSince}>
          {profile.dateEmployment ? (
            format(parseISO(profile.dateEmployment), 'd MMMM yyyy')
          ) : (
            <span className='text-muted-foreground'>{content.summary.notSet}</span>
          )}
        </SummaryRow>
      </dl>

      <p className='text-muted-foreground text-xs'>{content.summary.managedHint}</p>

      <div className='flex flex-col gap-2 border-t pt-5'>
        <h3 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>{content.summary.security}</h3>
        <ChangePasswordDialog />
      </div>
    </section>
  );
}

function SummaryRow({ icon: Icon, label, children }: SummaryRowProps) {
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

interface ProfileSummaryCardProps {
  profile: UserProfile;
}

interface SummaryRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}
