import { describe, expect, it } from 'vitest';

import { inviteMemberFormSchema } from '@/lib/schemas/invite-member-form.schema';

describe('inviteMemberFormSchema', () => {
  it('trims and lowercases the email', () => {
    expect(inviteMemberFormSchema.parse({ email: '  New.Person@SoftBee.dev ', role: 'worker' })).toEqual({
      email: 'new.person@softbee.dev',
      role: 'worker'
    });
  });

  it.each(['', '   ', 'not-an-email', 'a@', '@softbee.dev'])('rejects the email %j', (email) => {
    expect(inviteMemberFormSchema.safeParse({ email, role: 'worker' }).success).toBe(false);
  });

  it.each(['owner', '', 'Admin'])('rejects the role %j', (role) => {
    expect(inviteMemberFormSchema.safeParse({ email: 'a@softbee.dev', role }).success).toBe(false);
  });
});
