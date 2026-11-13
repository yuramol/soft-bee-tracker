import Link from 'next/link';
import { LinkIcon } from 'lucide-react';

import { SystemState } from '@components/common/system-state/system-state';
import { buttonVariants } from '@ui/button';
import { ROUTES } from '@/constants';
import content from './content.json';

// where /auth/confirm sends an expired, used or superseded email link. public
// and not guest-only, so it shows whether or not the visitor is signed in
export default function LinkInvalidPage() {
  return (
    <SystemState
      icon={LinkIcon}
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
