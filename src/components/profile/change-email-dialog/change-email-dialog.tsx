'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailIcon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@components/common/form/form-field';
import { IconInput } from '@components/common/form/icon-input';
import { Button } from '@ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { FieldGroup } from '@ui/field';
import { Input } from '@ui/input';
import { useRequestEmailChange } from '@/lib/api/auth';
import { formatText } from '@/lib/format-text';
import { createEmailChangeFormSchema, type EmailChangeFormValues } from '@/lib/schemas/profile-form.schema';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function ChangeEmailDialog({ currentEmail }: ChangeEmailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const requestEmailChange = useRequestEmailChange();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<EmailChangeFormValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(createEmailChangeFormSchema(currentEmail))
  });

  const isBusy = requestEmailChange.isPending;

  function handleEmailSubmit(values: EmailChangeFormValues) {
    const email = values.email.trim();

    function handleSent() {
      toast.success(formatText(content.email.sent, { email }));
      reset();
      setIsOpen(false);
    }

    function handleFailed(error: ApiError) {
      toast.error(error.message);
    }

    requestEmailChange.mutate({ email }, { onSuccess: handleSent, onError: handleFailed });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    // the dialog is portaled, but React still bubbles submit to the profile form it sits in
    event.stopPropagation();
    void handleSubmit(handleEmailSubmit)(event);
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      reset();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* sits inside the read-only email input, like the inline edit pencils elsewhere */}
      <DialogTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={content.email.title}
            title={content.email.title}
            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2'
          />
        }
      >
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleFormSubmit} noValidate className='flex flex-col gap-4'>
          <DialogHeader>
            <DialogTitle>{content.email.title}</DialogTitle>
            <DialogDescription>{content.email.description}</DialogDescription>
          </DialogHeader>

          <FieldGroup className='gap-4'>
            <FormField label={content.email.currentLabel} htmlFor='currentEmail'>
              <Input id='currentEmail' type='email' value={currentEmail} readOnly disabled />
            </FormField>
            <FormField label={content.email.newLabel} htmlFor='newEmail' error={errors.email}>
              <IconInput
                id='newEmail'
                icon={MailIcon}
                type='email'
                autoComplete='email'
                placeholder={content.email.newPlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </FormField>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type='button' variant='outline' disabled={isBusy} />}>{content.email.cancelButton}</DialogClose>
            <Button type='submit' disabled={isBusy}>
              {isBusy ? content.email.sendingButton : content.email.sendButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ChangeEmailDialogProps {
  currentEmail: string;
}
