import { UpdatePasswordForm } from '@/components/auth/update-password-form/update-password-form';
import { AuthHeading } from '@components/layout/auth-shell/auth-heading';
import content from './content.json';

export default function UpdatePasswordPage() {
  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <AuthHeading title={content.title} description={content.description} />

      <UpdatePasswordForm />
    </div>
  );
}
