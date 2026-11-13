'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Loader2Icon, MailIcon } from 'lucide-react';

import { FormField } from '@components/common/form/form-field';
import { IconInput } from '@components/common/form/icon-input';
import { Button } from '@ui/button';
import { ROUTES } from '@/constants';
import { useRecoverPassword } from '@/lib/api/auth';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '@/lib/schemas/forgot-password-form.schema';
import content from './content.json';

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
      <FormField label={content.emailLabel} htmlFor='email' error={errors.email}>
        <IconInput
          id='email'
          icon={MailIcon}
          type='email'
          autoComplete='email'
          placeholder={content.emailPlaceholder}
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </FormField>

      <Button className='w-full' size='xl' disabled={isBusy} type='submit'>
        {isBusy ? <Loader2Icon data-icon='inline-start' className='animate-spin' /> : null}
        {content.submitButton}
      </Button>

      <Link className='text-muted-foreground hover:text-foreground text-center text-sm transition-colors' href={ROUTES.LOGIN}>
        {content.backToSignInLink}
      </Link>
    </form>
  );
}
