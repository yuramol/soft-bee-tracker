'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useController, useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Input } from '@ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { useProjectsStore } from '@/lib/api/projects';
import type { Project } from '@/lib/api/projects';
import { useCreateTracker } from '@/lib/api/trackers';
import {
  buildCreateTrackerInput,
  createTrackerFormDefaults,
  trackerFormSchema,
  type TrackerFormValues
} from '@/lib/schemas/tracker-form.schema';

export function CreateTrackerDialog() {
  const [open, setOpen] = useState(false);
  const projects = useProjectsStore((state) => state.projects);
  const getProjects = useProjectsStore((state) => state.getProjects);
  const isLoadingProjects = useProjectsStore((state) => state.isLoading);
  const projectsError = useProjectsStore((state) => state.error);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<TrackerFormValues>({
    defaultValues: createTrackerFormDefaults(),
    resolver: zodResolver(trackerFormSchema)
  });
  const createTracker = useCreateTracker();
  const isBusy = isSubmitting || createTracker.isPending;

  useEffect(() => {
    if (!open) {
      return;
    }

    void getProjects().catch(() => undefined);
  }, [getProjects, open]);

  function handleTrackerSubmit(values: TrackerFormValues) {
    createTracker.mutate(buildCreateTrackerInput(values), {
      onSuccess: () => {
        reset(createTrackerFormDefaults());
        setOpen(false);
      }
    });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleTrackerSubmit)(event);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (isBusy) {
      return;
    }

    if (!nextOpen) {
      reset(createTrackerFormDefaults());
    }

    setOpen(nextOpen);
  }

  function handleCancelClick() {
    if (!isBusy) {
      reset(createTrackerFormDefaults());
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} disablePointerDismissal={isBusy}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon='inline-start' />
        New tracker
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>Create tracker</DialogTitle>
          <DialogDescription>Add a manual time entry for one of your projects.</DialogDescription>
        </DialogHeader>

        <form className='grid gap-4' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            <ProjectField
              control={control}
              projects={projects}
              isLoading={isLoadingProjects}
              errorMessage={projectsError?.message}
              disabled={isBusy}
            />

            <Field data-invalid={Boolean(errors.date)}>
              <FieldLabel htmlFor='date'>Date</FieldLabel>
              <Input id='date' type='date' disabled={isBusy} aria-invalid={Boolean(errors.date)} {...register('date')} />
              <FieldError errors={[errors.date]} />
            </Field>

            <Field data-invalid={Boolean(errors.durationMinutes)}>
              <FieldLabel htmlFor='durationMinutes'>Duration (minutes)</FieldLabel>
              <Input
                id='durationMinutes'
                type='number'
                min={1}
                step={1}
                disabled={isBusy}
                aria-invalid={Boolean(errors.durationMinutes)}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.durationMinutes]} />
            </Field>

            <Field className='sm:col-span-2' data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor='description'>Description (optional)</FieldLabel>
              <Input
                id='description'
                placeholder='What did you work on?'
                disabled={isBusy}
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              <FieldError errors={[errors.description]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              Cancel
            </Button>
            <Button type='submit' disabled={isBusy || projects.length === 0}>
              {isBusy ? 'Creating…' : 'Create tracker'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectFieldProps {
  control: ReturnType<typeof useForm<TrackerFormValues>>['control'];
  projects: Project[];
  isLoading: boolean;
  errorMessage?: string;
  disabled: boolean;
}

function ProjectField({ control, projects, isLoading, errorMessage, disabled }: ProjectFieldProps) {
  const { field, fieldState } = useController({ control, name: 'projectId' });

  function handleProjectChange(value: string | null) {
    if (value) {
      field.onChange(value);
    }
  }

  const placeholder = isLoading ? 'Loading projects…' : projects.length === 0 ? 'No projects available' : 'Select a project';

  return (
    <Field className='sm:col-span-2' data-invalid={Boolean(fieldState.error) || Boolean(errorMessage)}>
      <FieldLabel htmlFor='projectId'>Project</FieldLabel>
      <Select value={field.value || null} onValueChange={handleProjectChange} disabled={disabled || isLoading || Boolean(errorMessage)}>
        <SelectTrigger id='projectId' className='w-full' aria-invalid={Boolean(fieldState.error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : <FieldError errors={[fieldState.error]} />}
    </Field>
  );
}
