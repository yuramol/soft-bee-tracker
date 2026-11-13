'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlayIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';

import { ProjectSelect } from '@components/tracker/project-select/project-select';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Textarea } from '@ui/textarea';
import { useProjects } from '@/lib/api/projects';
import { useStartLiveTracker } from '@/lib/api/trackers';
import {
  buildStartLiveTrackerInput,
  LIVE_TRACKER_FORM_DEFAULTS,
  liveTrackerFormSchema,
  type LiveTrackerFormValues
} from '@/lib/schemas/live-tracker-form.schema';
import content from '../content.json';

export function StartLiveTrackerDialog() {
  const [open, setOpen] = useState(false);
  const { data: projects = [], isLoading: isLoadingProjects, error: projectsError } = useProjects(open);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<LiveTrackerFormValues>({
    defaultValues: LIVE_TRACKER_FORM_DEFAULTS,
    resolver: zodResolver(liveTrackerFormSchema)
  });
  const { field: projectField } = useController({ control, name: 'projectId' });
  const startLiveTracker = useStartLiveTracker({ onSuccess: handleStarted });
  const isBusy = startLiveTracker.isPending;

  function handleStarted() {
    reset(LIVE_TRACKER_FORM_DEFAULTS);
    setOpen(false);
  }

  function handleStartSubmit(values: LiveTrackerFormValues) {
    startLiveTracker.mutate(buildStartLiveTrackerInput(values));
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleStartSubmit)(event);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (isBusy) {
      return;
    }

    if (!nextOpen) {
      reset(LIVE_TRACKER_FORM_DEFAULTS);
    }

    setOpen(nextOpen);
  }

  function handleCancelClick() {
    handleDialogOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} disablePointerDismissal={isBusy}>
      <DialogTrigger
        render={
          <Button
            size='icon'
            aria-label={content.startDialog.triggerButton}
            title={content.startDialog.triggerButton}
            className='size-12 rounded-full shadow-lg'
          />
        }
      >
        <PlayIcon className='size-4.5 translate-x-px fill-current' />
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{content.startDialog.title}</DialogTitle>
          <DialogDescription>{content.startDialog.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='gap-4'>
            <Field data-invalid={Boolean(errors.projectId) || Boolean(projectsError)}>
              <FieldLabel htmlFor='liveProjectId'>{content.startDialog.projectLabel}</FieldLabel>
              <ProjectSelect
                id='liveProjectId'
                value={projectField.value}
                onChange={projectField.onChange}
                projects={projects}
                isLoading={isLoadingProjects}
                isDisabled={isBusy || Boolean(projectsError)}
                isInvalid={Boolean(errors.projectId)}
              />
              {projectsError ? <FieldError>{projectsError.message}</FieldError> : <FieldError errors={[errors.projectId]} />}
            </Field>

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor='liveDescription'>{content.startDialog.descriptionLabel}</FieldLabel>
              <Textarea
                id='liveDescription'
                rows={4}
                placeholder={content.startDialog.descriptionPlaceholder}
                disabled={isBusy}
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              <FieldError errors={[errors.description]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.startDialog.cancelButton}
            </Button>
            <Button type='submit' className='px-6 has-data-[icon=inline-start]:pl-5' disabled={isBusy || projects.length === 0}>
              <PlayIcon data-icon='inline-start' />
              {isBusy ? content.startDialog.submittingButton : content.startDialog.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
