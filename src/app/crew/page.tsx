import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';

export default async function CrewPage() {
  await requireRouteAccess(ROUTES.CREW);

  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-6 text-center'>
      <h1 className='text-3xl font-semibold tracking-tight'>Crew</h1>
    </div>
  );
}
