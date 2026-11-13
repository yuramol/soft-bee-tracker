'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { TrackerFormFields } from '@components/tracker/tracker-form-fields/tracker-form-fields';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { useProjects } from '@/lib/api/projects';
import { useCreateTracker } from '@/lib/api/trackers';
import {
  buildCreateTrackerInput,
  createTrackerFormDefaults,
  trackerFormSchema,
  type TrackerFormValues
} from '@/lib/schemas/tracker-form.schema';
import content from '../content.json';

export function CreateTrackerDialog({ defaultDate, triggerSize = 'default' }: CreateTrackerDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: projects = [], isLoading: isLoadingProjects, error: projectsError } = useProjects(open);
  const form = useForm<TrackerFormValues>({
    defaultValues: createTrackerFormDefaults(defaultDate),
    resolver: zodResolver(trackerFormSchema)
  });
  const {
    formState: { isSubmitting },
    handleSubmit,
    reset
  } = form;
  const createTracker = useCreateTracker();
  const isBusy = isSubmitting || createTracker.isPending;

  function handleTrackerSubmit(values: TrackerFormValues) {
    createTracker.mutate(buildCreateTrackerInput(values), {
      onSuccess: () => {
        reset(createTrackerFormDefaults(defaultDate));
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

    reset(createTrackerFormDefaults(defaultDate));

    setOpen(nextOpen);
  }

  function handleCancelClick() {
    handleDialogOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} disablePointerDismissal={isBusy}>
      <DialogTrigger render={<Button size={triggerSize} />}>
        <PlusIcon data-icon='inline-start' />
        {content.createDialog.triggerButton}
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{content.createDialog.title}</DialogTitle>
          <DialogDescription>{content.createDialog.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <TrackerFormFields
            form={form}
            idPrefix='create'
            projects={projects}
            isLoadingProjects={isLoadingProjects}
            projectsError={projectsError}
            isDisabled={isBusy}
          />

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.createDialog.cancelButton}
            </Button>
            <Button type='submit' disabled={isBusy || projects.length === 0}>
              {isBusy ? content.createDialog.submittingButton : content.createDialog.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CreateTrackerDialogProps {
  defaultDate?: string;
  triggerSize?: 'default' | 'lg';
}
