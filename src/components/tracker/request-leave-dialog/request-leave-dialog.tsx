'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PalmtreeIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
import type { LeaveType } from '@/mocks/leave.mock';
import content from '../content.json';

export function RequestLeaveDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<LeaveRequestFormValues>({
    defaultValues: createLeaveRequestFormDefaults(),
    resolver: zodResolver(leaveRequestFormSchema)
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = form;
  const { field: typeField } = useController({ control, name: 'leaveType' });
  const { field: startField } = useController({ control, name: 'startDate' });
  const { field: endField } = useController({ control, name: 'endDate' });
  const workingDays = countLeaveWorkingDays(startField.value, endField.value);

  function handleLeaveSubmit() {
    toast.info(content.leave.dialog.notConnected);
    setOpen(false);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleLeaveSubmit)(event);
  }

  function handleOpenChange(nextOpen: boolean) {
    reset(createLeaveRequestFormDefaults());
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
        {content.leave.requestButton}
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{content.leave.dialog.title}</DialogTitle>
          <DialogDescription>{content.leave.dialog.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            <Field className='sm:col-span-2' data-invalid={Boolean(errors.leaveType)}>
              <FieldLabel htmlFor='leaveType'>{content.leave.dialog.typeLabel}</FieldLabel>
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
              <FieldLabel htmlFor='leaveStart'>{content.leave.dialog.startLabel}</FieldLabel>
              <DatePicker id='leaveStart' value={startField.value} onChange={startField.onChange} isInvalid={Boolean(errors.startDate)} />
              <FieldError errors={[errors.startDate]} />
            </Field>

            <Field data-invalid={Boolean(errors.endDate)}>
              <FieldLabel htmlFor='leaveEnd'>{content.leave.dialog.endLabel}</FieldLabel>
              <DatePicker id='leaveEnd' value={endField.value} onChange={endField.onChange} isInvalid={Boolean(errors.endDate)} />
              <FieldError errors={[errors.endDate]} />
            </Field>

            <p className='text-muted-foreground text-sm sm:col-span-2'>
              {formatText(content.leave.dialog.workingDays, {
                count: workingDays,
                unit: workingDays === 1 ? content.leave.day : content.leave.days
              })}
            </p>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.note)}>
              <FieldLabel htmlFor='leaveNote'>{content.leave.dialog.noteLabel}</FieldLabel>
              <Textarea id='leaveNote' placeholder={content.leave.dialog.notePlaceholder} {...register('note')} />
              <FieldError errors={[errors.note]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleCancelClick}>
              {content.leave.dialog.cancelButton}
            </Button>
            <Button type='submit'>{content.leave.dialog.submitButton}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const LEAVE_TYPE_ITEMS = LEAVE_TYPES.map((leaveType) => ({ value: leaveType, label: content.leave.types[leaveType] }));
