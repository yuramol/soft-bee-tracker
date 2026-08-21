import { redirect } from 'next/navigation';

import { CreateTrackerDialog } from '@components/tracker/create-tracker-dialog/create-tracker-dialog';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';
import { TrackersList } from '@components/tracker/trackers-list';

export default async function TrackerPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className='mx-auto flex w-full max-w-4xl flex-col gap-6'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Tracker</h1>
        <CreateTrackerDialog userId={profile.id} />
        <TrackersList />
      </div>
    </div>
  );
}
