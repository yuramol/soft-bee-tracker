'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { DatePicker } from '@components/common/form/date-picker';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Input } from '@ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Textarea } from '@ui/textarea';
import { useCreateProject } from '@/lib/api/projects';
import type { Project, ProjectType } from '@/lib/api/projects';
import {
  buildCreateProjectInput,
  CREATE_PROJECT_FORM_DEFAULTS,
  createProjectFormSchema,
  type CreateProjectFormValues
} from '@/lib/schemas/create-project-form.schema';
import { formatText } from '@/lib/format-text';
import content from '../content.json';

const PROJECT_TYPE_OPTIONS: Array<{ label: string; value: ProjectType }> = [
  { label: content.createDialog.typeOptions.time_material, value: 'time_material' },
  { label: content.createDialog.typeOptions.fixed_price, value: 'fixed_price' },
  { label: content.createDialog.typeOptions.non_profit, value: 'non_profit' }
];

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createProject, isPending: isCreating, error: createError, reset: resetCreation } = useCreateProject();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<CreateProjectFormValues>({
    defaultValues: CREATE_PROJECT_FORM_DEFAULTS,
    resolver: zodResolver(createProjectFormSchema)
  });
  const { field: typeField } = useController({ control, name: 'type' });
  const { field: startDateField } = useController({ control, name: 'startDate' });
  const { field: endDateField } = useController({ control, name: 'endDate' });
  const isBusy = isSubmitting || isCreating;

  function handleProjectCreated(project: Project) {
    toast.success(formatText(content.createDialog.created, { name: project.name }));
    reset(CREATE_PROJECT_FORM_DEFAULTS);
    resetCreation();
    setOpen(false);
  }

  function handleProjectSubmit(values: CreateProjectFormValues) {
    createProject(buildCreateProjectInput(values), { onSuccess: handleProjectCreated });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleProjectSubmit)(event);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (isBusy) {
      return;
    }

    if (nextOpen) {
      resetCreation();
    } else {
      reset(CREATE_PROJECT_FORM_DEFAULTS);
      resetCreation();
    }

    setOpen(nextOpen);
  }

  function handleCancelClick() {
    if (!isBusy) {
      reset(CREATE_PROJECT_FORM_DEFAULTS);
      resetCreation();
      setOpen(false);
    }
  }

  function handleProjectTypeChange(value: ProjectType | null) {
    if (value) {
      typeField.onChange(value);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} disablePointerDismissal={isBusy}>
      <DialogTrigger render={<Button size='lg' />}>
        <PlusIcon data-icon='inline-start' />
        {content.createDialog.triggerButton}
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{content.createDialog.title}</DialogTitle>
          <DialogDescription>{content.createDialog.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            <Field className='sm:col-span-2' data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor='name'>{content.createDialog.nameLabel}</FieldLabel>
              <Input
                id='name'
                placeholder={content.createDialog.namePlaceholder}
                autoComplete='off'
                disabled={isBusy}
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.client)}>
              <FieldLabel htmlFor='client'>{content.createDialog.clientLabel}</FieldLabel>
              <Input
                id='client'
                placeholder={content.createDialog.clientPlaceholder}
                autoComplete='organization'
                disabled={isBusy}
                aria-invalid={Boolean(errors.client)}
                {...register('client')}
              />
              <FieldError errors={[errors.client]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.type)}>
              <FieldLabel htmlFor='type'>{content.createDialog.typeLabel}</FieldLabel>
              <Select<ProjectType>
                value={typeField.value}
                onValueChange={handleProjectTypeChange}
                items={PROJECT_TYPE_OPTIONS}
                disabled={isBusy}
              >
                <SelectTrigger id='type' className='w-full' aria-invalid={Boolean(errors.type)}>
                  <SelectValue placeholder={content.createDialog.typePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.type]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.note)}>
              <FieldLabel htmlFor='note'>{content.createDialog.noteLabel}</FieldLabel>
              <Textarea
                id='note'
                placeholder={content.createDialog.notePlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.note)}
                {...register('note')}
              />
              <FieldError errors={[errors.note]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.pictureUrl)}>
              <FieldLabel htmlFor='pictureUrl'>{content.createDialog.pictureUrlLabel}</FieldLabel>
              <Input
                id='pictureUrl'
                type='url'
                placeholder={content.createDialog.pictureUrlPlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.pictureUrl)}
                {...register('pictureUrl')}
              />
              <FieldError errors={[errors.pictureUrl]} />
            </Field>

            <Field data-invalid={Boolean(errors.startDate)}>
              <FieldLabel htmlFor='startDate'>{content.createDialog.startDateLabel}</FieldLabel>
              <DatePicker
                id='startDate'
                value={startDateField.value}
                onChange={startDateField.onChange}
                isDisabled={isBusy}
                isInvalid={Boolean(errors.startDate)}
              />
              <FieldError errors={[errors.startDate]} />
            </Field>

            <Field data-invalid={Boolean(errors.endDate)}>
              <FieldLabel htmlFor='endDate'>{content.createDialog.endDateLabel}</FieldLabel>
              <DatePicker
                id='endDate'
                value={endDateField.value}
                onChange={endDateField.onChange}
                isDisabled={isBusy}
                isInvalid={Boolean(errors.endDate)}
              />
              <FieldError errors={[errors.endDate]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            {createError ? (
              <p role='alert' className='text-destructive mr-auto self-center text-sm'>
                {createError.message}
              </p>
            ) : null}
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.createDialog.cancelButton}
            </Button>
            <Button type='submit' disabled={isBusy}>
              {isBusy ? content.createDialog.submittingButton : content.createDialog.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
