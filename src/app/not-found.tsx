import Link from 'next/link';
import { CompassIcon } from 'lucide-react';

import { SystemState } from '@components/common/system-state/system-state';
import { buttonVariants } from '@ui/button';
import { ROUTES } from '@/constants';
import content from './content.json';

export default function NotFound() {
  return (
    <main className='flex min-h-screen items-center justify-center'>
      <SystemState
        code={content.notFound.code}
        icon={CompassIcon}
        title={content.notFound.title}
        description={content.notFound.description}
        actions={
          <Link href={ROUTES.TRACKER} className={buttonVariants({ size: 'lg' })}>
            {content.notFound.backLink}
          </Link>
        }
      />
    </main>
  );
}
