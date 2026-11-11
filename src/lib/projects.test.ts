import { describe, expect, it } from 'vitest';

import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectRecord, ProjectViewer } from '@/mocks/projects.mock';
import {
  addProjectMember,
  applyProjectUpdate,
  buildProjectHref,
  containsSecret,
  createProjectRecord,
  filterProjects,
  getAddableMembers,
  getDescriptionSummary,
  getManagerCandidates,
  getProjectAccess,
  getProjectsPermissions,
  getShortName,
  getVisibleProjects,
  hasSecretUrlParams,
  isProjectNameTaken,
  parseDescription,
  parseProjectParams,
  removeProjectMember,
  summarizeProjectTime,
  type ProjectUpdateValues
} from '@/lib/projects';

function project(overrides: Partial<ProjectRecord>): ProjectRecord {
  return {
    id: 'p1',
    name: 'Atlas CRM',
    description: 'CRM platform',
    managerId: 'mgr',
    status: 'active',
    memberIds: ['mgr', 'staff'],
    links: [],
    weekMinutesByMember: { mgr: 60, staff: 120 },
    version: 1,
    ...overrides
  };
}

function person(overrides: Partial<CrewMember>): CrewMember {
  return {
    id: 'm1',
    firstName: 'Iryna',
    lastName: 'Shevchenko',
    email: 'iryna@softbee.dev',
    role: 'worker',
    position: 'Frontend engineer',
    status: 'active',
    phone: null,
    linkedin: null,
    upwork: null,
    employmentDate: null,
    managerId: 'mgr',
    projects: [],
    weekMinutesByProject: {},
    monthMinutes: 0,
    ...overrides
  };
}

const admin: ProjectViewer = { id: 'admin', role: 'admin' };
const manager: ProjectViewer = { id: 'mgr', role: 'manager' };
const otherManager: ProjectViewer = { id: 'other', role: 'manager' };
const staff: ProjectViewer = { id: 'staff', role: 'worker' };

const updateValues: ProjectUpdateValues = {
  name: ' Renamed ',
  description: ' New scope ',
  managerId: 'other',
  status: 'archived',
  links: [{ label: ' Repo ', url: ' https://github.com/softbee/atlas ' }]
};

describe('getProjectsPermissions', () => {
  it('lets admins and managers create projects but not staff', () => {
    expect(getProjectsPermissions('admin')).toEqual({ canCreate: true, canChooseManager: true });
    expect(getProjectsPermissions('manager')).toEqual({ canCreate: true, canChooseManager: true });
    expect(getProjectsPermissions('worker')).toEqual({ canCreate: false, canChooseManager: false });
  });
});

describe('getProjectAccess', () => {
  it('gives admins every field, members and status', () => {
    expect(getProjectAccess(project({}), admin)).toEqual({
      canEdit: true,
      editableFields: ['name', 'description', 'managerId', 'status', 'links'],
      canManageMembers: true,
      canChangeStatus: true,
      canViewTeamTime: true
    });
  });

  it('gives the responsible manager the same rights as an admin', () => {
    expect(getProjectAccess(project({}), manager)).toEqual(getProjectAccess(project({}), admin));
  });

  it('gives other managers and staff read-only access', () => {
    for (const viewer of [otherManager, staff]) {
      const access = getProjectAccess(project({}), viewer);

      expect(access.canEdit).toBe(false);
      expect(access.editableFields).toEqual([]);
      expect(access.canManageMembers).toBe(false);
      expect(access.canViewTeamTime).toBe(false);
    }
  });
});

describe('getVisibleProjects', () => {
  const projects = [
    project({ id: 'mine', managerId: 'mgr', memberIds: ['mgr'] }),
    project({ id: 'assigned', managerId: 'other', memberIds: ['other', 'staff'] }),
    project({ id: 'foreign', managerId: 'other', memberIds: ['other'] })
  ];

  it('shows admins everything', () => {
    expect(getVisibleProjects(projects, admin).map((item) => item.id)).toEqual(['mine', 'assigned', 'foreign']);
  });

  it('shows managers the projects they are responsible for', () => {
    expect(getVisibleProjects(projects, manager).map((item) => item.id)).toEqual(['mine']);
  });

  it('shows staff only assigned projects', () => {
    expect(getVisibleProjects(projects, staff).map((item) => item.id)).toEqual(['assigned']);
  });
});

describe('filterProjects', () => {
  const projects = [
    project({ id: 'b', name: 'Nova Mobile', description: 'Booking app' }),
    project({ id: 'a', name: 'Atlas CRM', description: 'Sales platform' }),
    project({ id: 'c', name: 'Legacy', status: 'archived' })
  ];

  it('filters by status and sorts by name', () => {
    expect(filterProjects(projects, { query: '', status: 'active' }).map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterProjects(projects, { query: '', status: 'archived' }).map((item) => item.id)).toEqual(['c']);
  });

  it('matches name or description case-insensitively', () => {
    expect(filterProjects(projects, { query: ' booking ', status: 'active' }).map((item) => item.id)).toEqual(['b']);
    expect(filterProjects(projects, { query: 'atlas', status: 'active' }).map((item) => item.id)).toEqual(['a']);
  });
});

describe('getAddableMembers', () => {
  const crew = [
    person({ id: 'staff', managerId: 'mgr' }),
    person({ id: 'team', firstName: 'Bohdan', managerId: 'mgr' }),
    person({ id: 'blocked', managerId: 'mgr', status: 'blocked' }),
    person({ id: 'outsider', firstName: 'Anna', managerId: 'other' })
  ];

  it('limits managers to active people from their team who are not members yet', () => {
    expect(getAddableMembers(project({}), crew, manager).map((item) => item.id)).toEqual(['team']);
  });

  it('lets admins add any active person', () => {
    expect(getAddableMembers(project({}), crew, admin).map((item) => item.id)).toEqual(['outsider', 'team']);
  });
});

describe('getManagerCandidates', () => {
  it('returns active managers and admins', () => {
    const crew = [
      person({ id: 'w', role: 'worker' }),
      person({ id: 'm', role: 'manager', firstName: 'Bo' }),
      person({ id: 'a', role: 'admin', firstName: 'Al' }),
      person({ id: 'x', role: 'manager', status: 'blocked' })
    ];

    expect(getManagerCandidates(crew).map((item) => item.id)).toEqual(['a', 'm']);
  });
});

describe('summarizeProjectTime', () => {
  it('sums the whole team for people who manage the project', () => {
    expect(summarizeProjectTime(project({}), manager)).toEqual({ minutes: 180, scope: 'team' });
  });

  it('shows staff only their own time', () => {
    expect(summarizeProjectTime(project({}), staff)).toEqual({ minutes: 120, scope: 'own' });
    expect(summarizeProjectTime(project({}), { id: 'nobody', role: 'worker' })).toEqual({ minutes: 0, scope: 'own' });
  });
});

describe('applyProjectUpdate', () => {
  it('saves only the fields the viewer may edit and bumps the version', () => {
    const result = applyProjectUpdate(project({}), updateValues, 1, ['description', 'links']);

    expect(result.status).toBe('saved');
    expect(result.project).toMatchObject({
      name: 'Atlas CRM',
      description: 'New scope',
      managerId: 'mgr',
      status: 'active',
      links: [{ label: 'Repo', url: 'https://github.com/softbee/atlas' }],
      version: 2
    });
  });

  it('adds a new responsible manager to the members without touching others', () => {
    const result = applyProjectUpdate(project({}), updateValues, 1, ['name', 'description', 'managerId', 'status', 'links']);

    expect(result.project.managerId).toBe('other');
    expect(result.project.status).toBe('archived');
    expect(result.project.memberIds).toEqual(['other', 'mgr', 'staff']);
  });

  it('reports a conflict instead of overwriting a newer version', () => {
    const current = project({ version: 3 });
    const result = applyProjectUpdate(current, updateValues, 2, ['description']);

    expect(result).toEqual({ status: 'conflict', project: current });
  });
});

describe('members', () => {
  it('never removes the responsible manager', () => {
    expect(removeProjectMember(project({}), 'mgr').memberIds).toEqual(['mgr', 'staff']);
    expect(removeProjectMember(project({}), 'staff').memberIds).toEqual(['mgr']);
  });

  it('adds a member once', () => {
    expect(addProjectMember(project({}), 'new').memberIds).toEqual(['mgr', 'staff', 'new']);
    expect(addProjectMember(project({}), 'staff').memberIds).toEqual(['mgr', 'staff']);
  });
});

describe('createProjectRecord', () => {
  it('creates an active project with the manager as its first member', () => {
    expect(createProjectRecord({ name: ' New ', description: ' Notes ', managerId: 'mgr' }, 'p9')).toEqual({
      id: 'p9',
      name: 'New',
      description: 'Notes',
      managerId: 'mgr',
      status: 'active',
      memberIds: ['mgr'],
      links: [],
      weekMinutesByMember: {},
      version: 1
    });
  });
});

describe('isProjectNameTaken', () => {
  it('compares names case-insensitively and skips the edited project', () => {
    const projects = [project({ id: 'p1', name: 'Atlas CRM' })];

    expect(isProjectNameTaken(projects, ' atlas crm ')).toBe(true);
    expect(isProjectNameTaken(projects, 'Atlas CRM', 'p1')).toBe(false);
    expect(isProjectNameTaken(projects, 'Nova')).toBe(false);
  });
});

describe('project params', () => {
  it('builds and parses list, details and edit hrefs', () => {
    expect(buildProjectHref()).toBe('/projects');
    expect(buildProjectHref('p1')).toBe('/projects?project=p1');
    expect(buildProjectHref('p1', 'edit')).toBe('/projects?project=p1&view=edit');

    expect(parseProjectParams(new URLSearchParams('project=p1&view=edit'))).toEqual({ projectId: 'p1', view: 'edit' });
    expect(parseProjectParams(new URLSearchParams('project=p1&view=other'))).toEqual({ projectId: 'p1', view: 'details' });
    expect(parseProjectParams(new URLSearchParams(''))).toEqual({ projectId: null, view: 'details' });
  });
});

describe('parseDescription', () => {
  it('splits paragraphs and simple lists', () => {
    expect(parseDescription('Intro line\nsecond line\n\nFocus:\n- One\n* Two\n1. First\n2) Second\n\nOutro')).toEqual([
      { type: 'paragraph', text: 'Intro line\nsecond line' },
      { type: 'paragraph', text: 'Focus:' },
      { type: 'list', ordered: false, items: ['One', 'Two'] },
      { type: 'list', ordered: true, items: ['First', 'Second'] },
      { type: 'paragraph', text: 'Outro' }
    ]);
  });

  it('returns nothing for an empty description', () => {
    expect(parseDescription('  \n\n ')).toEqual([]);
  });

  it('summarizes with the first line without list markers', () => {
    expect(getDescriptionSummary('\n- Checkout flow\nmore')).toBe('Checkout flow');
    expect(getDescriptionSummary('')).toBe('');
  });
});

describe('secret detection', () => {
  it('flags credentials and secret params in URLs', () => {
    expect(hasSecretUrlParams('https://user:pass@example.com')).toBe(true);
    expect(hasSecretUrlParams('https://example.com/docs?token=abc')).toBe(true);
    expect(hasSecretUrlParams('https://example.com/cb#access_token=abc')).toBe(true);
    expect(hasSecretUrlParams('https://example.com/file?X-Amz-Signature=abc')).toBe(true);
    expect(hasSecretUrlParams('https://softbee.atlassian.net/browse/ATL-1?filter=10')).toBe(false);
    expect(hasSecretUrlParams('not a url')).toBe(false);
  });

  it('flags passwords, tokens and secret links in text', () => {
    expect(containsSecret('Staging password: hunter2')).toBe(true);
    expect(containsSecret('api_key=abc123')).toBe(true);
    expect(containsSecret('use ghp_abcdefghijklmnopqrstuvwxyz0123')).toBe(true);
    expect(containsSecret('see https://example.com/?secret=1 for access')).toBe(true);
    expect(containsSecret('Reset your password in the vault. Docs: https://docs.softbee.dev/atlas')).toBe(false);
  });
});

describe('getShortName', () => {
  it('shortens the last name to an initial', () => {
    expect(getShortName({ firstName: 'Andrii', lastName: 'Melnyk' })).toBe('Andrii M.');
    expect(getShortName({ firstName: 'Andrii', lastName: '' })).toBe('Andrii');
  });
});
