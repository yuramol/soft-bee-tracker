'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { ROUTES } from '@/constants';
import { useRecoverPassword } from '@/lib/api/auth';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '@/lib/schemas/forgot-password-form.schema';

export function ForgotPasswordForm() {
  const recoverPassword = useRecoverPassword();

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: ''
    },
    resolver: zodResolver(forgotPasswordFormSchema)
  });

  function handleRecoverSubmit(values: ForgotPasswordFormValues) {
    recoverPassword.mutate(values);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleRecoverSubmit)(event);
  }

  const isBusy = isSubmitting || recoverPassword.isPending;

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

      <Button className='w-full' disabled={isBusy} type='submit'>
        Send reset link
      </Button>

      <Link className='text-muted-foreground hover:text-foreground text-center text-sm transition-colors' href={ROUTES.LOGIN}>
        Back to sign in
      </Link>
    </form>
  );
}
