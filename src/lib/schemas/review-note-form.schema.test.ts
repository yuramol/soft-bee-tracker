import { describe, expect, it } from 'vitest';

import { reviewNoteFormSchema } from './review-note-form.schema';

describe('reviewNoteFormSchema', () => {
  it('accepts a reason and trims it', () => {
    expect(reviewNoteFormSchema.parse({ note: '  Wrong project  ' })).toEqual({ note: 'Wrong project' });
  });

  it('requires a reason that is not blank', () => {
    expect(reviewNoteFormSchema.safeParse({ note: '   ' }).success).toBe(false);
  });

  it('caps the reason at 500 characters', () => {
    expect(reviewNoteFormSchema.safeParse({ note: 'a'.repeat(500) }).success).toBe(true);
    expect(reviewNoteFormSchema.safeParse({ note: 'a'.repeat(501) }).success).toBe(false);
  });
});
