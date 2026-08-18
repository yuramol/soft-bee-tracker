import { redirect } from 'next/navigation';

import { ProfileForm } from '@components/profile/profile-form/profile-form';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';

export default async function ProfilePage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className='mx-auto w-full max-w-2xl'>
      <ProfileForm profile={profile} />
    </div>
  );
}
