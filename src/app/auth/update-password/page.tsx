import { UpdatePasswordForm } from '@/components/auth/update-password-form/update-password-form';

export default function UpdatePasswordPage() {
  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Set a new password</h1>
        <p className='text-muted-foreground text-sm'>Choose a strong password for your account</p>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
