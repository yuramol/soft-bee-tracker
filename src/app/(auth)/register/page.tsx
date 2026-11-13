import Link from 'next/link';
import { MailQuestionIcon } from 'lucide-react';

import { RegisterForm } from '@/components/auth/register-form/register-form';
import { SystemState } from '@components/common/system-state/system-state';
import { AuthHeading } from '@components/layout/auth-shell/auth-heading';
import { buttonVariants } from '@ui/button';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';
import content from './content.json';

export default async function RegisterPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    return (
      <SystemState
        icon={MailQuestionIcon}
        title={content.inviteOnly.title}
        description={content.inviteOnly.description}
        actions={
          <Link href={ROUTES.LOGIN} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            {content.inviteOnly.backToSignInLink}
          </Link>
        }
      />
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <AuthHeading title={content.title} description={content.description} />

      <RegisterForm email={profile.email} />
    </div>
  );
}
