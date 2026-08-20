'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Input } from '@ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Textarea } from '@ui/textarea';
import { useCreateProjectStore } from '@/lib/api/projects';
import type { ProjectType } from '@/lib/api/projects';
import {
  buildCreateProjectInput,
  CREATE_PROJECT_FORM_DEFAULTS,
  createProjectFormSchema,
  type CreateProjectFormValues
} from '@/lib/schemas/create-project-form.schema';

const PROJECT_TYPE_OPTIONS: Array<{ label: string; value: ProjectType }> = [
  { label: 'Time and material', value: 'time_material' },
  { label: 'Fixed price', value: 'fixed_price' },
  { label: 'Non-profit', value: 'non_profit' }
];

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const createProject = useCreateProjectStore((state) => state.createProject);
  const isCreating = useCreateProjectStore((state) => state.isCreating);
  const createError = useCreateProjectStore((state) => state.createError);
  const resetCreation = useCreateProjectStore((state) => state.reset);
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
  const isBusy = isSubmitting || isCreating;

  async function handleProjectSubmit(values: CreateProjectFormValues) {
    try {
      const project = await createProject(buildCreateProjectInput(values));
      toast.success(`${project.name} was created`);
      reset(CREATE_PROJECT_FORM_DEFAULTS);
      resetCreation();
      setOpen(false);
    } catch {
      // The creation store owns and exposes the normalized API error.
    }
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
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon='inline-start' />
        New project
      </DialogTrigger>

      <DialogContent className='max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Add a project that you will manage.</DialogDescription>
        </DialogHeader>

        <form className='grid gap-4' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            <Field className='sm:col-span-2' data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor='name'>Project name</FieldLabel>
              <Input
                id='name'
                placeholder='Website redesign'
                autoComplete='off'
                disabled={isBusy}
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.client)}>
              <FieldLabel htmlFor='client'>Client</FieldLabel>
              <Input
                id='client'
                placeholder='Acme'
                autoComplete='organization'
                disabled={isBusy}
                aria-invalid={Boolean(errors.client)}
                {...register('client')}
              />
              <FieldError errors={[errors.client]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.type)}>
              <FieldLabel htmlFor='type'>Project type</FieldLabel>
              <Select<ProjectType> value={typeField.value} onValueChange={handleProjectTypeChange} disabled={isBusy}>
                <SelectTrigger id='type' className='w-full' aria-invalid={Boolean(errors.type)}>
                  <SelectValue placeholder='Select a project type' />
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
              <FieldLabel htmlFor='note'>Note (optional)</FieldLabel>
              <Textarea
                id='note'
                placeholder='Project context or delivery notes'
                disabled={isBusy}
                aria-invalid={Boolean(errors.note)}
                {...register('note')}
              />
              <FieldError errors={[errors.note]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.pictureUrl)}>
              <FieldLabel htmlFor='pictureUrl'>Picture URL (optional)</FieldLabel>
              <Input
                id='pictureUrl'
                type='url'
                placeholder='https://example.com/project.png'
                disabled={isBusy}
                aria-invalid={Boolean(errors.pictureUrl)}
                {...register('pictureUrl')}
              />
              <FieldError errors={[errors.pictureUrl]} />
            </Field>

            <Field data-invalid={Boolean(errors.startDate)}>
              <FieldLabel htmlFor='startDate'>Start date (optional)</FieldLabel>
              <Input id='startDate' type='date' disabled={isBusy} aria-invalid={Boolean(errors.startDate)} {...register('startDate')} />
              <FieldError errors={[errors.startDate]} />
            </Field>

            <Field data-invalid={Boolean(errors.endDate)}>
              <FieldLabel htmlFor='endDate'>End date (optional)</FieldLabel>
              <Input id='endDate' type='date' disabled={isBusy} aria-invalid={Boolean(errors.endDate)} {...register('endDate')} />
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
              Cancel
            </Button>
            <Button type='submit' disabled={isBusy}>
              {isBusy ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
