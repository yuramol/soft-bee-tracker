'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Loader2Icon, MailIcon } from 'lucide-react';

import { FormField } from '@components/common/form/form-field';
import { IconInput } from '@components/common/form/icon-input';
import { PasswordInput } from '@components/common/form/password-input';
import { Button } from '@ui/button';
import { ROUTES } from '@/constants';
import { useUpdatePassword } from '@/lib/api/auth';
import { updatePasswordFormSchema, type UpdatePasswordFormValues } from '@/lib/schemas/update-password-form.schema';
import content from './content.json';

interface RegisterFormProps {
  email: string;
}

export function RegisterForm({ email }: RegisterFormProps) {
  const router = useRouter();
  const updatePassword = useUpdatePassword({
    successMessage: content.successMessage,
    onSuccess: () => {
      router.push(ROUTES.PROFILE);
      router.refresh();
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

  function handleRegisterSubmit(values: UpdatePasswordFormValues) {
    updatePassword.mutate({ password: values.password });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleRegisterSubmit)(event);
  }

  const isBusy = isSubmitting || updatePassword.isPending;

  return (
    <form className='flex flex-col gap-5' onSubmit={handleFormSubmit} noValidate>
      <FormField label={content.emailLabel} htmlFor='email' description={content.emailDescription}>
        <IconInput id='email' icon={MailIcon} type='email' value={email} readOnly disabled />
      </FormField>

      <FormField label={content.passwordLabel} htmlFor='password' error={errors.password}>
        <PasswordInput
          id='password'
          autoComplete='new-password'
          placeholder={content.passwordPlaceholder}
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </FormField>

      <FormField label={content.confirmPasswordLabel} htmlFor='confirmPassword' error={errors.confirmPassword}>
        <PasswordInput
          id='confirmPassword'
          autoComplete='new-password'
          placeholder={content.passwordPlaceholder}
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
      </FormField>

      <Button className='w-full' size='xl' disabled={isBusy} type='submit'>
        {isBusy ? <Loader2Icon data-icon='inline-start' className='animate-spin' /> : null}
        {content.submitButton}
      </Button>
    </form>
  );
}
