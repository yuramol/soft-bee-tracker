'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
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
import { trackerFormSchema, type TrackerFormValues } from '@/lib/schemas/tracker-form.schema';

interface CreateTrackerDialogProps {
  userId: string;
}

export function CreateTrackerDialog({ userId }: CreateTrackerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    defaultValues: createDefaultValues(),
    resolver: zodResolver(trackerFormSchema)
  });
  const createTracker = useCreateTracker({ onSuccess: handleCreateSuccess });

  useEffect(() => {
    if (projects.length === 0) {
      void getProjects().catch(() => undefined);
    }
  }, [getProjects, projects.length]);

  function handleCreateSuccess() {
    setIsOpen(false);
    reset(createDefaultValues());
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      reset(createDefaultValues());
    }
  }

  function handleTrackerSubmit(values: TrackerFormValues) {
    createTracker.mutate({
      projectId: values.projectId,
      userId,
      date: values.date,
      description: values.description.trim() || null,
      durationMinutes: values.durationMinutes,
      isLive: false,
      liveDurationMinutes: 0,
      liveStatus: null,
      status: 'new',
      startLiveDate: null,
      transactionId: null
    });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleTrackerSubmit)(event);
  }

  function handleCancelClick() {
    handleOpenChange(false);
  }

  const isBusy = isSubmitting || createTracker.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        New tracker
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create tracker</DialogTitle>
          <DialogDescription>Add a manual time entry for one of your projects.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='grid gap-5 sm:grid-cols-2'>
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
              <FieldLabel htmlFor='description'>Description</FieldLabel>
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

          <DialogFooter className='mt-5'>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              Cancel
            </Button>
            <Button type='submit' disabled={isBusy || projects.length === 0}>
              {createTracker.isPending ? 'Creating…' : 'Create tracker'}
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

  return (
    <Field data-invalid={Boolean(fieldState.error)}>
      <FieldLabel htmlFor='projectId'>Project</FieldLabel>
      <Select value={field.value} onValueChange={field.onChange} disabled={disabled || isLoading || Boolean(errorMessage)}>
        <SelectTrigger id='projectId' className='w-full' aria-invalid={Boolean(fieldState.error)}>
          <SelectValue placeholder={isLoading ? 'Loading projects…' : 'Select a project'} />
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

function createDefaultValues(): TrackerFormValues {
  return {
    projectId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    durationMinutes: 60,
    description: ''
  };
}
