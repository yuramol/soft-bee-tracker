'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PalmtreeIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';

import { DatePicker } from '@components/common/form/date-picker';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Textarea } from '@ui/textarea';
import { formatText } from '@/lib/format-text';
import { countLeaveWorkingDays, LEAVE_TYPES } from '@/lib/leave-days';
import {
  createLeaveRequestFormDefaults,
  leaveRequestFormSchema,
  type LeaveRequestFormValues
} from '@/lib/schemas/leave-request-form.schema';
import type { LeaveType } from '@/lib/api/leave';
import content from '../content.json';

export function RequestLeaveDialog({ mode = 'request', onSubmit }: RequestLeaveDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const copy = mode === 'grant' ? content.leave.grantDialog : content.leave.dialog;
  const form = useForm<LeaveRequestFormValues>({
    defaultValues: createLeaveRequestFormDefaults(),
    resolver: zodResolver(leaveRequestFormSchema)
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = form;
  const { field: typeField } = useController({ control, name: 'leaveType' });
  const { field: startField } = useController({ control, name: 'startDate' });
  const { field: endField } = useController({ control, name: 'endDate' });
  const workingDays = countLeaveWorkingDays(startField.value, endField.value);

  // the dialog closes only after a successful save; on failure it keeps what was typed
  async function handleLeaveSubmit(values: LeaveRequestFormValues) {
    setSubmitError(null);

    try {
      await onSubmit(values);
      setOpen(false);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleLeaveSubmit)(event);
  }

  function handleOpenChange(nextOpen: boolean) {
    reset(createLeaveRequestFormDefaults());
    setSubmitError(null);
    setOpen(nextOpen);
  }

  function handleCancelClick() {
    handleOpenChange(false);
  }

  function handleTypeChange(value: LeaveType | null) {
    if (value) {
      typeField.onChange(value);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size='lg' className='w-full' />}>
        <PalmtreeIcon data-icon='inline-start' />
        {mode === 'grant' ? content.leave.grantDialog.triggerButton : content.leave.requestButton}
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            <Field className='sm:col-span-2' data-invalid={Boolean(errors.leaveType)}>
              <FieldLabel htmlFor='leaveType'>{copy.typeLabel}</FieldLabel>
              <Select value={typeField.value} onValueChange={handleTypeChange} items={LEAVE_TYPE_ITEMS}>
                <SelectTrigger id='leaveType' className='w-full' aria-invalid={Boolean(errors.leaveType)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.leaveType]} />
            </Field>

            <Field data-invalid={Boolean(errors.startDate)}>
              <FieldLabel htmlFor='leaveStart'>{copy.startLabel}</FieldLabel>
              <DatePicker id='leaveStart' value={startField.value} onChange={startField.onChange} isInvalid={Boolean(errors.startDate)} />
              <FieldError errors={[errors.startDate]} />
            </Field>

            <Field data-invalid={Boolean(errors.endDate)}>
              <FieldLabel htmlFor='leaveEnd'>{copy.endLabel}</FieldLabel>
              <DatePicker id='leaveEnd' value={endField.value} onChange={endField.onChange} isInvalid={Boolean(errors.endDate)} />
              <FieldError errors={[errors.endDate]} />
            </Field>

            <p className='text-muted-foreground text-sm sm:col-span-2'>
              {formatText(copy.workingDays, {
                count: workingDays,
                unit: workingDays === 1 ? content.leave.day : content.leave.days
              })}
            </p>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.note)}>
              <FieldLabel htmlFor='leaveNote'>{copy.noteLabel}</FieldLabel>
              <Textarea id='leaveNote' placeholder={copy.notePlaceholder} {...register('note')} />
              <FieldError errors={[errors.note]} />
            </Field>
          </FieldGroup>

          {submitError ? (
            <p role='alert' className='text-destructive text-sm'>
              {submitError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isSubmitting} onClick={handleCancelClick}>
              {copy.cancelButton}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {copy.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getErrorMessage(error: unknown): string {
  // unknown: a rejected promise can carry anything; ApiError-shaped values keep their message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return content.leave.dialog.submitError;
}

const LEAVE_TYPE_ITEMS = LEAVE_TYPES.map((leaveType) => ({ value: leaveType, label: content.leave.types[leaveType] }));

interface RequestLeaveDialogProps {
  mode?: 'request' | 'grant';
  onSubmit: (values: LeaveRequestFormValues) => Promise<void> | void;
}
