import { ForgotPasswordForm } from '@/components/auth/forgot-password-form/forgot-password-form';
import { AuthHeading } from '@components/layout/auth-shell/auth-heading';
import content from './content.json';

export default function ForgotPasswordPage() {
  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <AuthHeading title={content.title} description={content.description} />

      <ForgotPasswordForm />
    </div>
  );
}
