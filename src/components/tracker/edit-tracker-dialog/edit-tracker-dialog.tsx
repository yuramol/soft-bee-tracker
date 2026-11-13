'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { TrackerFormFields } from '@components/tracker/tracker-form-fields/tracker-form-fields';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { useProjects } from '@/lib/api/projects';
import { useUpdateTracker } from '@/lib/api/trackers';
import type { Tracker } from '@/lib/api/trackers';
import { buildCreateTrackerInput, trackerFormSchema, trackerToFormValues, type TrackerFormValues } from '@/lib/schemas/tracker-form.schema';
import content from '../content.json';

export function EditTrackerDialog({ tracker, open, onOpenChange }: EditTrackerDialogProps) {
  const { data: projects = [], isLoading: isLoadingProjects, error: projectsError } = useProjects(open);
  const form = useForm<TrackerFormValues>({
    defaultValues: trackerToFormValues(tracker),
    resolver: zodResolver(trackerFormSchema)
  });
  const updateTracker = useUpdateTracker({ onSuccess: handleSaved });
  const isBusy = form.formState.isSubmitting || updateTracker.isPending;

  function handleSaved() {
    onOpenChange(false);
  }

  function handleEntrySubmit(values: TrackerFormValues) {
    updateTracker.mutate({ trackerId: tracker.id, entry: buildCreateTrackerInput(values) });
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
          <DialogTitle>{content.editDialog.title}</DialogTitle>
          <DialogDescription>{content.editDialog.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <TrackerFormFields
            form={form}
            idPrefix='edit'
            projects={projects}
            isLoadingProjects={isLoadingProjects}
            projectsError={projectsError}
            isDisabled={isBusy}
          />

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.editDialog.cancelButton}
            </Button>
            <Button type='submit' disabled={isBusy}>
              {isBusy ? content.editDialog.submittingButton : content.editDialog.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditTrackerDialogProps {
  tracker: Tracker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
