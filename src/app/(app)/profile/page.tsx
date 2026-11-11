import { redirect } from 'next/navigation';

import { PageHeader } from '@components/common/page-header/page-header';
import { MyProjects } from '@components/profile/my-projects/my-projects';
import { ProfileForm } from '@components/profile/profile-form/profile-form';
import { ProfileSummaryCard } from '@components/profile/profile-summary-card/profile-summary-card';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';
import content from './content.json';

export default async function ProfilePage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <>
      <PageHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <div className='grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)]'>
        <ProfileSummaryCard profile={profile} />
        <div className='flex min-w-0 flex-col gap-8'>
          <ProfileForm profile={profile} />
          <MyProjects role={profile.role} />
        </div>
      </div>
    </>
  );
}
