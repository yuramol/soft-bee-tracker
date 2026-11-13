'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { TrackerFormFields } from '@components/tracker/tracker-form-fields/tracker-form-fields';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { useProjects } from '@/lib/api/projects';
import { useFinishLiveTracker } from '@/lib/api/trackers';
import type { Tracker } from '@/lib/api/trackers';
import {
  buildCreateTrackerInput,
  liveTrackerToFormValues,
  trackerFormSchema,
  type TrackerFormValues
} from '@/lib/schemas/tracker-form.schema';
import content from '../content.json';

export function FinishLiveTrackerDialog({ tracker, open, onOpenChange }: FinishLiveTrackerDialogProps) {
  const { data: projects = [], isLoading: isLoadingProjects, error: projectsError } = useProjects(open);
  const form = useForm<TrackerFormValues>({
    defaultValues: liveTrackerToFormValues(tracker, new Date()),
    resolver: zodResolver(trackerFormSchema)
  });
  const finishTracker = useFinishLiveTracker({ onSuccess: handleSaved });
  const isBusy = form.formState.isSubmitting || finishTracker.isPending;

  function handleSaved() {
    onOpenChange(false);
  }

  function handleEntrySubmit(values: TrackerFormValues) {
    finishTracker.mutate({ tracker, entry: buildCreateTrackerInput(values) });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void form.handleSubmit(handleEntrySubmit)(event);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!isBusy) {
      onOpenChange(nextOpen);
    }
  }

  function handleCancelClick() {
    handleDialogOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} disablePointerDismissal={isBusy}>
      <DialogContent className='sm:max-w-lg' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{content.finishDialog.title}</DialogTitle>
          <DialogDescription>{content.finishDialog.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <TrackerFormFields
            form={form}
            idPrefix='finish'
            projects={projects}
            isLoadingProjects={isLoadingProjects}
            projectsError={projectsError}
            isDisabled={isBusy}
          />

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.finishDialog.cancelButton}
            </Button>
            <Button type='submit' disabled={isBusy || projects.length === 0}>
              <CheckIcon data-icon='inline-start' />
              {isBusy ? content.finishDialog.submittingButton : content.finishDialog.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FinishLiveTrackerDialogProps {
  tracker: Tracker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
