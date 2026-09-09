import { redirect } from 'next/navigation';

import { CreateTrackerDialog } from '@components/tracker/create-tracker-dialog/create-tracker-dialog';
import { TrackersList } from '@components/tracker/trackers-list';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';

export default async function TrackerPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-6'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Tracker</h1>
        <CreateTrackerDialog />
      </div>
      <TrackersList />
    </div>
  );
}
