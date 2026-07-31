'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { ROUTES } from '@/constants';
import { useUpdatePassword } from '@/lib/api/auth';
import { updatePasswordFormSchema, type UpdatePasswordFormValues } from '@/lib/schemas/update-password-form.schema';

export function UpdatePasswordForm() {
  const router = useRouter();
  const updatePassword = useUpdatePassword({
    onSuccess: () => {
      router.push(ROUTES.LOGIN);
    }
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<UpdatePasswordFormValues>({
    defaultValues: {
      password: '',
      confirmPassword: ''
    },
    resolver: zodResolver(updatePasswordFormSchema)
  });

  function handleUpdateSubmit(values: UpdatePasswordFormValues) {
    updatePassword.mutate({ password: values.password });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleUpdateSubmit)(event);
  }

  const isBusy = isSubmitting || updatePassword.isPending;

  return (
    <form className='flex flex-col gap-5' onSubmit={handleFormSubmit} noValidate>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='password'>New password</Label>
        <Input
          id='password'
          type='password'
          autoComplete='new-password'
          placeholder='••••••••'
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? <p className='text-destructive text-sm'>{errors.password.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='confirmPassword'>Confirm new password</Label>
        <Input
          id='confirmPassword'
          type='password'
          autoComplete='new-password'
          placeholder='••••••••'
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? <p className='text-destructive text-sm'>{errors.confirmPassword.message}</p> : null}
      </div>

      <Button className='w-full' disabled={isBusy} type='submit'>
        Change password
      </Button>
    </form>
  );
}
