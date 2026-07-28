import { ForgotPasswordForm } from '@/components/auth/forgot-password-form/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Reset your password</h1>
        <p className='text-muted-foreground text-sm'>Enter your email and we will send you a reset link</p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
