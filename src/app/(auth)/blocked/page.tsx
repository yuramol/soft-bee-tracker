import Link from 'next/link';
import { ShieldOffIcon } from 'lucide-react';

import { SystemState } from '@components/common/system-state/system-state';
import { buttonVariants } from '@ui/button';
import { ROUTES } from '@/constants';
import content from './content.json';

export default function BlockedPage() {
  return (
    <SystemState
      icon={ShieldOffIcon}
      title={content.title}
      description={content.description}
      actions={
        <Link href={ROUTES.LOGIN} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          {content.backToSignInLink}
        </Link>
      }
    />
  );
}
