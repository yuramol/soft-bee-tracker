'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Undo2Icon, XIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Field, FieldError, FieldLabel } from '@ui/field';
import { Textarea } from '@ui/textarea';
import type { Tracker, TrackerReviewNoteInput } from '@/lib/api/trackers';
import { REVIEW_NOTE_FORM_DEFAULTS, reviewNoteFormSchema, type ReviewNoteFormValues } from '@/lib/schemas/review-note-form.schema';
import content from '../content.json';
import { formatText } from '@/lib/format/format-text';

// asks for the reason a review action needs: rejecting an entry or undoing a review.
// open while `target` is set; the parent owns the mutations and clears `target` to close
export function ReviewNoteDialog({ target, entryLabel, memberName, isBusy, onReject, onUndo, onClose }: ReviewNoteDialogProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<ReviewNoteFormValues>({
    defaultValues: REVIEW_NOTE_FORM_DEFAULTS,
    resolver: zodResolver(reviewNoteFormSchema)
  });

  // clear the note whenever the parent drops `target` (cancel, success, concurrent status)
  useEffect(() => {
    if (target === null) {
      reset(REVIEW_NOTE_FORM_DEFAULTS);
    }
  }, [target, reset]);

  const mode: ReviewNoteMode = target?.mode ?? 'reject';
  const copy = content.reviewNoteDialog[mode];
  const SubmitIcon = mode === 'reject' ? XIcon : Undo2Icon;

  function handleNoteSubmit(values: ReviewNoteFormValues) {
    if (!target) {
      return;
    }

    const input = { trackerId: target.tracker.id, note: values.note };

    if (target.mode === 'reject') {
      onReject(input);
    } else {
      onUndo(input);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleNoteSubmit)(event);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen || isBusy) {
      return;
    }

    onClose();
  }

  function handleCancelClick() {
    handleDialogOpenChange(false);
  }

  return (
    <Dialog open={target !== null} onOpenChange={handleDialogOpenChange} disablePointerDismissal={isBusy}>
      <DialogContent className='sm:max-w-md' showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{formatText(copy.description, { entry: entryLabel, name: memberName })}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <Field data-invalid={Boolean(errors.note)}>
            <FieldLabel htmlFor='reviewNote'>{content.reviewNoteDialog.reasonLabel}</FieldLabel>
            <Textarea
              id='reviewNote'
              rows={3}
              maxLength={500}
              autoFocus
              placeholder={copy.placeholder}
              disabled={isBusy}
              aria-invalid={Boolean(errors.note)}
              {...register('note')}
            />
            <FieldError errors={[errors.note]} />
          </Field>

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.reviewNoteDialog.cancelButton}
            </Button>
            <Button type='submit' variant={mode === 'reject' ? 'destructive' : 'default'} disabled={isBusy}>
              <SubmitIcon data-icon='inline-start' />
              {isBusy ? copy.submittingButton : copy.submitButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type ReviewNoteMode = 'reject' | 'undo';

export interface ReviewNoteTarget {
  tracker: Tracker;
  mode: ReviewNoteMode;
}

interface ReviewNoteDialogProps {
  target: ReviewNoteTarget | null;
  entryLabel: string;
  memberName: string;
  isBusy: boolean;
  onReject: (input: TrackerReviewNoteInput) => void;
  onUndo: (input: TrackerReviewNoteInput) => void;
  onClose: () => void;
}
