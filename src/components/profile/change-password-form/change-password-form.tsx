'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormField } from '@components/common/form/form-field';
import { PasswordInput } from '@components/common/form/password-input';
import { Button } from '@ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ui/card';
import { FieldGroup } from '@ui/field';
import { useChangePassword } from '@/lib/api/auth';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '@/lib/schemas/change-password-form.schema';
import content from './content.json';

export function ChangePasswordForm() {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<ChangePasswordFormValues>({
    defaultValues: CHANGE_PASSWORD_DEFAULTS,
    resolver: zodResolver(changePasswordFormSchema)
  });

  const changePassword = useChangePassword({
    onSuccess: () => {
      reset(CHANGE_PASSWORD_DEFAULTS);
    }
  });

  function handleChangeSubmit(values: ChangePasswordFormValues) {
    changePassword.mutate({ currentPassword: values.currentPassword, password: values.password });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleChangeSubmit)(event);
  }

  const isBusy = isSubmitting || changePassword.isPending;

  return (
    <Card className='shadow-sm'>
      <CardHeader className='border-b'>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} noValidate>
        <CardContent>
          <FieldGroup className='grid gap-5'>
            <FormField label={content.currentPasswordLabel} htmlFor='currentPassword' error={errors.currentPassword}>
              <PasswordInput
                id='currentPassword'
                autoComplete='current-password'
                placeholder={content.passwordPlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.currentPassword)}
                {...register('currentPassword')}
              />
            </FormField>

            <FormField label={content.passwordLabel} htmlFor='newPassword' error={errors.password}>
              <PasswordInput
                id='newPassword'
                autoComplete='new-password'
                placeholder={content.passwordPlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </FormField>

            <FormField className='mb-5' label={content.confirmPasswordLabel} htmlFor='confirmNewPassword' error={errors.confirmPassword}>
              <PasswordInput
                id='confirmNewPassword'
                autoComplete='new-password'
                placeholder={content.passwordPlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
            </FormField>
          </FieldGroup>
        </CardContent>

        <CardFooter className='justify-end'>
          <Button type='submit' disabled={isBusy}>
            {isBusy ? content.submittingButton : content.submitButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

const CHANGE_PASSWORD_DEFAULTS: ChangePasswordFormValues = {
  currentPassword: '',
  password: '',
  confirmPassword: ''
};
