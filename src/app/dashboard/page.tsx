import Link from 'next/link';

import { ROUTES } from '@/constants';

export default function DashboardPage() {
  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-6 text-center'>
      <h1 className='text-3xl font-semibold tracking-tight'>Dashboard</h1>
      <p className='text-muted-foreground text-sm'>Your Soft Bee Tracker workspace will appear here.</p>
      <Link className='text-muted-foreground hover:text-foreground text-sm transition-colors' href={ROUTES.LOGIN}>
        Sign out and return to login
      </Link>
    </div>
  );
}
