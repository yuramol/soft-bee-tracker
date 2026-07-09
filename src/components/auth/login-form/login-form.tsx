'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { ROUTES } from '@/constants';
import { useSignIn } from '@/lib/api/auth';
import { loginFormSchema, type LoginFormValues } from '@/lib/schemas/login-form.schema';

export function LoginForm() {
  const router = useRouter();
  const signIn = useSignIn({
    onSuccess: () => {
      router.push(ROUTES.DASHBOARD);
      router.refresh();
    }
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: ''
    },
    resolver: zodResolver(loginFormSchema)
  });

  function handleLoginSubmit(values: LoginFormValues) {
    signIn.mutate(values);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleLoginSubmit)(event);
  }

  const isBusy = isSubmitting || signIn.isPending;

  return (
    <form className='flex flex-col gap-5' onSubmit={handleFormSubmit} noValidate>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          type='email'
          autoComplete='email'
          placeholder='you@example.com'
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email ? <p className='text-destructive text-sm'>{errors.email.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          type='password'
          autoComplete='current-password'
          placeholder='••••••••'
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? <p className='text-destructive text-sm'>{errors.password.message}</p> : null}
      </div>

      <Button className='w-full' disabled={isBusy} type='submit'>
        Sign in
      </Button>

      <div className='flex flex-col gap-2 text-center text-sm'>
        <Link className='text-muted-foreground hover:text-foreground transition-colors' href={ROUTES.FORGOT_PASSWORD}>
          Forgot password?
        </Link>
        <p className='text-muted-foreground'>
          Not registered yet?{' '}
          <Link className='text-foreground font-medium hover:underline' href={ROUTES.REGISTER}>
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}
