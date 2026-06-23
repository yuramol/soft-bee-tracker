import Link from 'next/link';

import { ROUTES } from '@/constants';

export default function ForgotPasswordPage() {
  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Reset your password</h1>
        <p className='text-muted-foreground text-sm'>Password recovery will be available in an upcoming release.</p>
      </div>

      <Link className='text-muted-foreground hover:text-foreground text-center text-sm transition-colors' href={ROUTES.LOGIN}>
        Back to sign in
      </Link>
    </div>
  );
}
