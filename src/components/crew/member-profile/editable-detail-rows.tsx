'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { CheckIcon, PencilIcon, XIcon, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useController, useForm } from 'react-hook-form';

import { StagedDatePicker } from '@components/common/form/staged-date-picker';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { formatText } from '@/lib/format-text';
import {
  memberEmploymentDateFormSchema,
  memberPositionFormSchema,
  type MemberEmploymentDateFormValues,
  type MemberPositionFormValues
} from '@/lib/schemas/member-employment-form.schema';
import content from '../content.json';

export function EditablePositionRow({ icon, value, onSave }: EditablePositionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<MemberPositionFormValues>({
    defaultValues: { position: value },
    resolver: zodResolver(memberPositionFormSchema)
  });

  function handleEdit() {
    reset({ position: value });
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handlePositionSubmit(values: MemberPositionFormValues) {
    const position = values.position.trim();

    if (position !== value) {
      onSave(position);
    }

    setIsEditing(false);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handlePositionSubmit)(event);
  }

  return (
    <InlineEditRow
      icon={icon}
      label={content.profile.position}
      isEditing={isEditing}
      error={errors.position?.message}
      display={value}
      onEdit={handleEdit}
      onCancel={handleCancel}
      onSubmit={handleFormSubmit}
    >
      <Input
        autoFocus
        autoComplete='off'
        aria-label={content.profile.position}
        aria-invalid={Boolean(errors.position)}
        placeholder={content.employment.positionPlaceholder}
        className='h-8'
        {...register('position')}
      />
    </InlineEditRow>
  );
}

export function EditableEmploymentDateRow({ icon, value, onSave }: EditableEmploymentDateRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [today] = useState(() => new Date());
  const {
    formState: { errors },
    control,
    handleSubmit,
    reset
  } = useForm<MemberEmploymentDateFormValues>({
    defaultValues: { employmentDate: value ?? '' },
    resolver: zodResolver(memberEmploymentDateFormSchema)
  });
  const { field } = useController({ control, name: 'employmentDate' });

  function handleEdit() {
    reset({ employmentDate: value ?? '' });
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleClearClick() {
    field.onChange('');
  }

  function handleDateSubmit(values: MemberEmploymentDateFormValues) {
    const employmentDate = values.employmentDate || null;

    if (employmentDate !== value) {
      onSave(employmentDate);
    }

    setIsEditing(false);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleDateSubmit)(event);
  }

  return (
    <InlineEditRow
      icon={icon}
      label={content.profile.employmentDate}
      isEditing={isEditing}
      error={errors.employmentDate?.message}
      display={value ? format(parseISO(value), 'd MMMM yyyy') : <span className='text-muted-foreground'>{content.profile.notAdded}</span>}
      onEdit={handleEdit}
      onCancel={handleCancel}
      onSubmit={handleFormSubmit}
      extraAction={
        field.value ? (
          <Button type='button' variant='ghost' size='sm' className='h-8' onClick={handleClearClick}>
            {content.employment.clearDate}
          </Button>
        ) : null
      }
    >
      <StagedDatePicker
        value={field.value}
        onChange={field.onChange}
        maxDate={today}
        placeholder={content.employment.datePlaceholder}
        isInvalid={Boolean(errors.employmentDate)}
        className='h-8 min-w-0'
      />
    </InlineEditRow>
  );
}

function InlineEditRow({
  icon: Icon,
  label,
  isEditing,
  error,
  display,
  extraAction,
  onEdit,
  onCancel,
  onSubmit,
  children
}: InlineEditRowProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    // portalled popovers bubble through React, so only keys pressed inside the row cancel it
    if (event.key === 'Escape' && event.target instanceof Node && event.currentTarget.contains(event.target)) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className='flex items-start gap-3'>
      <span className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'>
        <Icon className='size-4' />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <dt className='text-muted-foreground text-xs'>{label}</dt>
        <dd className='text-sm break-words'>
          {isEditing ? (
            <form onSubmit={onSubmit} onKeyDown={handleKeyDown} noValidate className='flex flex-col gap-1 pt-0.5'>
              <div className='flex items-center gap-1'>
                <div className='min-w-0 flex-1'>{children}</div>
                {extraAction}
                <Button type='submit' size='icon-sm' aria-label={formatText(content.employment.saveLabel, { label })}>
                  <CheckIcon />
                </Button>
                <Button type='button' variant='ghost' size='icon-sm' aria-label={content.employment.cancelButton} onClick={onCancel}>
                  <XIcon />
                </Button>
              </div>
              {error ? (
                <p role='alert' className='text-destructive text-xs'>
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <span className='group/edit flex items-center gap-1'>
              <span className='min-w-0'>{display}</span>
              <Button
                type='button'
                variant='ghost'
                size='icon-xs'
                aria-label={formatText(content.employment.editLabel, { label })}
                className='text-muted-foreground hover:text-foreground -my-1 shrink-0 opacity-60 group-hover/edit:opacity-100 focus-visible:opacity-100'
                onClick={onEdit}
              >
                <PencilIcon />
              </Button>
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}

interface EditablePositionRowProps {
  icon: LucideIcon;
  value: string;
  onSave: (position: string) => void;
}

interface EditableEmploymentDateRowProps {
  icon: LucideIcon;
  value: string | null;
  onSave: (employmentDate: string | null) => void;
}

interface InlineEditRowProps {
  icon: LucideIcon;
  label: string;
  isEditing: boolean;
  error: string | undefined;
  display: ReactNode;
  extraAction?: ReactNode;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}
