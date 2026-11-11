import { describe, expect, it } from 'vitest';

import { changePasswordFormSchema } from './change-password-form.schema';

const VALID = { currentPassword: 'OldPassw0rd', password: 'NewPassw0rd', confirmPassword: 'NewPassw0rd' };

describe('change password form schema', () => {
  it('accepts a valid change', () => {
    expect(changePasswordFormSchema.safeParse(VALID).success).toBe(true);
  });

  it('requires the current password', () => {
    expect(changePasswordFormSchema.safeParse({ ...VALID, currentPassword: '' }).success).toBe(false);
  });

  it('applies the same strength rules as register and login', () => {
    expect(changePasswordFormSchema.safeParse({ ...VALID, password: 'weak', confirmPassword: 'weak' }).success).toBe(false);
  });

  it('rejects a mismatched confirmation', () => {
    expect(changePasswordFormSchema.safeParse({ ...VALID, confirmPassword: 'Different1' }).success).toBe(false);
  });

  it('rejects reusing the current password', () => {
    const result = changePasswordFormSchema.safeParse({
      ...VALID,
      password: VALID.currentPassword,
      confirmPassword: VALID.currentPassword
    });

    expect(result.success).toBe(false);
  });
});
