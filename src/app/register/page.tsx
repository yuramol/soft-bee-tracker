import { RegisterForm } from '@/components/auth/register-form/register-form';

export default function RegisterPage() {
  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Create an account</h1>
        <p className='text-muted-foreground text-sm'>Join Soft Bee Tracker to track your work</p>
      </div>

      <RegisterForm />
    </div>
  );
}
