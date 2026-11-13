'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@components/common/form/form-field';
import { PasswordInput } from '@components/common/form/password-input';
import { Button } from '@ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { FieldGroup } from '@ui/field';
import { useUpdatePassword } from '@/lib/api/auth';
import { updatePasswordFormSchema, type UpdatePasswordFormValues } from '@/lib/schemas/update-password-form.schema';
import content from '../content.json';

export function ChangePasswordDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<UpdatePasswordFormValues>({
    defaultValues: { password: '', confirmPassword: '' },
    resolver: zodResolver(updatePasswordFormSchema)
  });
  const updatePassword = useUpdatePassword({ successMessage: content.password.saved, onSuccess: handlePasswordChanged });

  const isBusy = updatePassword.isPending;

  function handlePasswordChanged() {
    reset();
    setIsOpen(false);
  }

  function handlePasswordSubmit(values: UpdatePasswordFormValues) {
    updatePassword.mutate({ password: values.password });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handlePasswordSubmit)(event);
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      reset();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type='button' variant='outline' className='w-full' />}>
        <KeyRoundIcon data-icon='inline-start' />
        {content.password.title}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleFormSubmit} noValidate className='flex flex-col gap-4'>
          <DialogHeader>
            <DialogTitle>{content.password.title}</DialogTitle>
            <DialogDescription>{content.password.description}</DialogDescription>
          </DialogHeader>

          <FieldGroup className='gap-4'>
            <FormField label={content.password.newLabel} htmlFor='newPassword' error={errors.password}>
              <PasswordInput
                id='newPassword'
                autoComplete='new-password'
                placeholder={content.password.placeholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </FormField>
            <FormField label={content.password.confirmLabel} htmlFor='confirmNewPassword' error={errors.confirmPassword}>
              <PasswordInput
                id='confirmNewPassword'
                autoComplete='new-password'
                placeholder={content.password.placeholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
            </FormField>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type='button' variant='outline' disabled={isBusy} />}>{content.password.cancelButton}</DialogClose>
            <Button type='submit' disabled={isBusy}>
              {isBusy ? content.password.savingButton : content.password.saveButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
