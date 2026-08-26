import { describe, expect, it } from 'vitest';

import { buildCreateProjectInput, CREATE_PROJECT_FORM_DEFAULTS, createProjectFormSchema } from './create-project-form.schema';

describe('create project form schema', () => {
  it('trims values and builds nullable optional fields', () => {
    const values = createProjectFormSchema.parse({
      ...CREATE_PROJECT_FORM_DEFAULTS,
      name: '  New project  ',
      client: '  Acme  ',
      note: '  Important  '
    });

    expect(buildCreateProjectInput(values)).toEqual({
      name: 'New project',
      client: 'Acme',
      type: 'time_material',
      note: 'Important',
      pictureUrl: null,
      startDate: null,
      endDate: null
    });
  });

  it('rejects an invalid picture URL', () => {
    const result = createProjectFormSchema.safeParse({
      ...CREATE_PROJECT_FORM_DEFAULTS,
      name: 'New project',
      client: 'Acme',
      pictureUrl: 'not-a-url'
    });

    expect(result.success).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    const result = createProjectFormSchema.safeParse({
      ...CREATE_PROJECT_FORM_DEFAULTS,
      name: 'New project',
      client: 'Acme',
      startDate: '2026-08-20',
      endDate: '2026-08-19'
    });

    expect(result.success).toBe(false);
  });

  it('enforces the database text limits', () => {
    const result = createProjectFormSchema.safeParse({
      ...CREATE_PROJECT_FORM_DEFAULTS,
      name: 'x'.repeat(256),
      client: 'Acme'
    });

    expect(result.success).toBe(false);
  });
});
