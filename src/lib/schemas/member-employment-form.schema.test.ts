import { addDays, format } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { memberEmploymentDateFormSchema, memberPositionFormSchema } from './member-employment-form.schema';

describe('memberPositionFormSchema', () => {
  it('accepts any non-blank text up to 100 characters', () => {
    expect(memberPositionFormSchema.safeParse({ position: 'Chief bee whisperer' }).success).toBe(true);
    expect(memberPositionFormSchema.safeParse({ position: '   ' }).success).toBe(false);
    expect(memberPositionFormSchema.safeParse({ position: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('memberEmploymentDateFormSchema', () => {
  it('accepts a past date or no date and rejects a future one', () => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    expect(memberEmploymentDateFormSchema.safeParse({ employmentDate: '2024-01-08' }).success).toBe(true);
    expect(memberEmploymentDateFormSchema.safeParse({ employmentDate: '' }).success).toBe(true);
    expect(memberEmploymentDateFormSchema.safeParse({ employmentDate: tomorrow }).success).toBe(false);
  });
});
