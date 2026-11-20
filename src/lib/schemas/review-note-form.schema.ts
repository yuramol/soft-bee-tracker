import { z } from 'zod';

import content from './content.json';

// rejecting and undoing a review both need a reason. matches the 500-character limit and
// the blank-reason check in private.guard_tracker_review
export const reviewNoteFormSchema = z.object({
  note: z.string().trim().min(1, content.trackerReview.reasonRequired).max(500, content.trackerReview.reasonTooLong)
});

export const REVIEW_NOTE_FORM_DEFAULTS: ReviewNoteFormValues = { note: '' };

export interface ReviewNoteFormValues {
  note: string;
}
