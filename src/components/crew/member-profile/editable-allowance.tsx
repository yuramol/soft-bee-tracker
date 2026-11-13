'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { formatText } from '@/lib/format-text';
import { leaveAllowanceFormSchema, type LeaveAllowanceFormValues } from '@/lib/schemas/leave-allowance-form.schema';
import content from '../content.json';

// days per year for one leave type; managers and admins set it from the member profile
export function EditableAllowance({ typeLabel, days, isSaving, onSave }: EditableAllowanceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<LeaveAllowanceFormValues>({
    defaultValues: { days: days ?? 0 },
    resolver: zodResolver(leaveAllowanceFormSchema)
  });
  const editLabel = formatText(content.profile.editAllowance, { type: typeLabel.toLowerCase() });

  function handleEdit() {
    reset({ days: days ?? 0 });
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  async function handleAllowanceSubmit(values: LeaveAllowanceFormValues) {
    if (values.days !== days) {
      await onSave(values.days);
    }

    setIsEditing(false);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleAllowanceSubmit)(event);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  if (!isEditing) {
    return (
      <Button
        type='button'
        variant='ghost'
        size='icon-xs'
        aria-label={editLabel}
        title={editLabel}
        className='text-muted-foreground hover:text-foreground'
        onClick={handleEdit}
      >
        <PencilIcon />
      </Button>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} noValidate className='flex flex-col items-end gap-1'>
      <div className='flex items-center gap-1'>
        <Input
          autoFocus
          type='number'
          inputMode='numeric'
          min={0}
          max={366}
          aria-label={formatText(content.profile.allowanceLabel, { type: typeLabel })}
          aria-invalid={Boolean(errors.days)}
          className='h-8 w-20 text-right tabular-nums'
          {...register('days', { valueAsNumber: true })}
        />
        <Button type='submit' size='icon-sm' disabled={isSaving} aria-label={content.profile.allowanceSave}>
          <CheckIcon />
        </Button>
        <Button type='button' variant='ghost' size='icon-sm' aria-label={content.profile.allowanceCancel} onClick={handleCancel}>
          <XIcon />
        </Button>
      </div>
      {errors.days ? (
        <p role='alert' className='text-destructive text-xs'>
          {errors.days.message}
        </p>
      ) : null}
    </form>
  );
}

interface EditableAllowanceProps {
  typeLabel: string;
  days: number | null;
  isSaving: boolean;
  onSave: (days: number) => Promise<void>;
}
