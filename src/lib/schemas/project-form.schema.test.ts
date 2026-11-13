import { describe, expect, it } from 'vitest';

import { createProjectFormSchema, projectFormSchema, type ProjectFormValues } from './project-form.schema';

const validValues: ProjectFormValues = {
  name: 'Atlas CRM',
  client: 'Acme',
  managerId: 'u2',
  description: 'Scope:\n- Checkout',
  status: 'active',
  links: [{ label: 'Repository', url: 'https://github.com/softbee/atlas-crm' }]
};

function issuesFor(values: Partial<ProjectFormValues>): string[] {
  const result = projectFormSchema.safeParse({ ...validValues, ...values });

  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('projectFormSchema', () => {
  it('accepts a valid project', () => {
    expect(issuesFor({})).toEqual([]);
  });

  it('requires a name and a manager', () => {
    expect(issuesFor({ name: '   ', managerId: '' })).toEqual(['name', 'managerId']);
  });

  it('rejects non-web and executable link schemes', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com', 'example.com']) {
      expect(issuesFor({ links: [{ label: 'Bad', url }] })).toEqual(['links.0.url']);
    }
  });

  it('requires a label for every link', () => {
    expect(issuesFor({ links: [{ label: ' ', url: 'https://example.com' }] })).toEqual(['links.0.label']);
  });

  it('rejects secrets in URLs and the description', () => {
    expect(issuesFor({ links: [{ label: 'Docs', url: 'https://example.com/docs?token=abc' }] })).toEqual(['links.0.url']);
    expect(issuesFor({ description: 'DB password: hunter2' })).toEqual(['description']);
  });
});

describe('createProjectFormSchema', () => {
  it('needs only name, manager, description and an optional client', () => {
    expect(createProjectFormSchema.safeParse({ name: 'New', client: '', managerId: 'u1', description: '', managerIds: [] }).success).toBe(
      true
    );
    expect(
      createProjectFormSchema.safeParse({ name: 'New', client: '', managerId: 'u1', description: '', managerIds: ['u2', 'u3'] }).success
    ).toBe(true);
  });

  it('limits the client to 255 characters', () => {
    const result = createProjectFormSchema.safeParse({
      name: 'New',
      client: 'x'.repeat(256),
      managerId: 'u1',
      description: '',
      managerIds: []
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['client']);
  });
});
