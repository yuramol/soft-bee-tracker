import type { Metadata } from 'next';
import Link from 'next/link';

import { ROUTES } from '@/constants';

export const metadata: Metadata = {
  title: 'Access denied',
  robots: { index: false }
};

// rendered by the proxy (rewrite, 403) and by requireRouteAccess (redirect)
// when a signed-in user's role may not open the requested page.
export default function AccessDeniedPage() {
  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-4 text-center'>
      <p className='text-muted-foreground text-sm font-medium'>403</p>
      <h1 className='text-3xl font-semibold tracking-tight'>Access denied</h1>
      <p className='text-muted-foreground text-sm'>
        Your role doesn&apos;t have access to this page. Ask an admin if you think you need it.
      </p>
      <Link className='text-muted-foreground hover:text-foreground text-sm transition-colors' href={ROUTES.TRACKER}>
        Go to Tracker
      </Link>
    </div>
  );
}
