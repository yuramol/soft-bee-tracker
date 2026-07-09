import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form/login-form';
import { ROUTES } from '@/constants';

export default function LoginPage() {
  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Welcome back</h1>
        <p className='text-muted-foreground text-sm'>Sign in to your Soft Bee Tracker account</p>
      </div>

      <LoginForm />

      <p className='text-muted-foreground text-center text-xs'>By continuing, you agree to the workspace terms of use.</p>

      <Link className='text-muted-foreground hover:text-foreground text-center text-sm transition-colors' href={ROUTES.DASHBOARD}>
        Back to home
      </Link>
    </div>
  );
}
