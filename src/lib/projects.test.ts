import { describe, expect, it } from 'vitest';

import type { ProjectRecord } from '@/lib/api/projects';
import type { Tracker } from '@/lib/api/trackers';
import type { ProjectPerson } from '@/lib/api/users';
import {
  buildProjectHref,
  canBeProjectManager,
  containsSecret,
  filterProjects,
  getAddableMembers,
  getDescriptionSummary,
  getManagerCandidates,
  getOrderedMembers,
  getProjectAccess,
  getProjectChanges,
  getProjectsPermissions,
  getShortName,
  getVisibleProjects,
  hasSecretUrlParams,
  isProjectNameTaken,
  parseDescription,
  parseProjectParams,
  summarizeProjectTime,
  type ProjectUpdateValues,
  type ProjectViewer
} from '@/lib/projects';

function project(overrides: Partial<ProjectRecord>): ProjectRecord {
  return {
    id: 'p1',
    name: 'Atlas CRM',
    client: 'Acme',
    description: 'CRM platform',
    managerId: 'mgr',
    status: 'active',
    memberIds: ['mgr', 'staff'],
    links: [],
    updatedAt: '2026-11-12T10:00:00.000000+00:00',
    ...overrides
  };
}

function person(overrides: Partial<ProjectPerson>): ProjectPerson {
  return {
    id: 'm1',
    firstName: 'Iryna',
    lastName: 'Shevchenko',
    role: 'worker',
    position: 'Frontend engineer',
    status: 'active',
    ...overrides
  };
}

function tracker(overrides: Partial<Tracker>): Tracker {
  return {
    id: 't1',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    date: '2026-11-12',
    description: null,
    durationMinutes: 60,
    isLive: false,
    liveDurationMinutes: 0,
    liveStatus: null,
    status: 'new',
    startLiveDate: null,
    projectId: 'p1',
    userId: 'mgr',
    transactionId: null,
    ...overrides
  };
}

const admin: ProjectViewer = { id: 'admin', role: 'admin' };
const manager: ProjectViewer = { id: 'mgr', role: 'manager' };
const otherManager: ProjectViewer = { id: 'other', role: 'manager' };
const staff: ProjectViewer = { id: 'staff', role: 'worker' };

const updateValues: ProjectUpdateValues = {
  name: ' Renamed ',
  client: ' Globex ',
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
      editableFields: ['name', 'client', 'description', 'managerId', 'status', 'links'],
      canManageMembers: true,
      canChangeStatus: true,
      canViewTeamTime: true
    });
  });

  it('gives the responsible manager the same rights as an admin', () => {
    expect(getProjectAccess(project({}), manager)).toEqual(getProjectAccess(project({}), admin));
  });

  it('gives every manager assigned to the project the same rights as the responsible manager', () => {
    const assigned = project({ memberIds: ['mgr', 'staff', 'other'] });

    expect(getProjectAccess(assigned, otherManager)).toEqual(getProjectAccess(assigned, admin));
  });

  it('gives assigned staff read-only access because of their role', () => {
    expect(getProjectAccess(project({}), staff).canEdit).toBe(false);
  });

  it('gives managers outside the project and staff read-only access', () => {
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
    project({ id: 'foreign', managerId: 'other', memberIds: ['other'] }),
    project({ id: 'team', managerId: 'other', memberIds: ['other', 'mgr'] })
  ];

  it('shows admins everything', () => {
    expect(getVisibleProjects(projects, admin).map((item) => item.id)).toEqual(['mine', 'assigned', 'foreign', 'team']);
  });

  it('shows managers the projects they are responsible for or assigned to', () => {
    expect(getVisibleProjects(projects, manager).map((item) => item.id)).toEqual(['mine', 'team']);
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
  it('lists active people who are not members yet, by first name', () => {
    const people = [
      person({ id: 'staff' }),
      person({ id: 'team', firstName: 'Bohdan' }),
      person({ id: 'blocked', status: 'blocked' }),
      person({ id: 'pending', status: 'pending' }),
      person({ id: 'outsider', firstName: 'Anna' })
    ];

    expect(getAddableMembers(project({}), people).map((item) => item.id)).toEqual(['outsider', 'team']);
  });
});

describe('getOrderedMembers', () => {
  it('puts the responsible person first and keeps the rest in order, skipping unknown ids', () => {
    const peopleById = new Map(['a', 'b', 'new-mgr', 'c'].map((id) => [id, person({ id })]));
    const handedOver = project({ managerId: 'new-mgr', memberIds: ['a', 'b', 'gone', 'new-mgr', 'c'] });

    expect(getOrderedMembers(handedOver, peopleById).map((item) => item.id)).toEqual(['new-mgr', 'a', 'b', 'c']);
  });
});

describe('canBeProjectManager', () => {
  it('allows managers and admins only', () => {
    expect(canBeProjectManager({ role: 'manager' })).toBe(true);
    expect(canBeProjectManager({ role: 'admin' })).toBe(true);
    expect(canBeProjectManager({ role: 'worker' })).toBe(false);
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

  it('keeps the viewer and the current responsible person even before their account is active', () => {
    const crew = [
      person({ id: 'me', role: 'manager', status: 'pending', firstName: 'Ror' }),
      person({ id: 'old', role: 'manager', status: 'blocked', firstName: 'Ole' }),
      person({ id: 'p', role: 'manager', status: 'pending', firstName: 'Pat' }),
      person({ id: 'w', role: 'worker', firstName: 'Wim' })
    ];

    expect(getManagerCandidates(crew, ['me', 'old', 'w', null]).map((item) => item.id)).toEqual(['old', 'me']);
  });
});

describe('summarizeProjectTime', () => {
  const now = new Date('2026-11-12T12:00:00.000Z');
  const trackers = [
    tracker({ id: 'a', userId: 'mgr', durationMinutes: 60 }),
    tracker({ id: 'b', userId: 'staff', durationMinutes: 120 }),
    tracker({ id: 'c', userId: 'staff', durationMinutes: 30, status: 'rejected' }),
    tracker({ id: 'd', userId: 'staff', durationMinutes: 45, projectId: 'other' })
  ];

  it('sums the whole team for people who manage the project, without rejected entries', () => {
    expect(summarizeProjectTime(project({}), trackers, manager, now)).toEqual({ minutes: 180, scope: 'team' });
  });

  it('shows staff only their own time', () => {
    expect(summarizeProjectTime(project({}), trackers, staff, now)).toEqual({ minutes: 120, scope: 'own' });
    expect(summarizeProjectTime(project({}), trackers, { id: 'nobody', role: 'worker' }, now)).toEqual({ minutes: 0, scope: 'own' });
  });
});

describe('getProjectChanges', () => {
  it('sends only the editable fields, trimmed', () => {
    expect(getProjectChanges(updateValues, ['description', 'links'])).toEqual({
      description: 'New scope',
      links: [{ label: 'Repo', url: 'https://github.com/softbee/atlas' }]
    });
  });

  it('sends every field to people who may edit the whole project', () => {
    expect(getProjectChanges(updateValues, ['name', 'client', 'description', 'managerId', 'status', 'links'])).toEqual({
      name: 'Renamed',
      client: 'Globex',
      description: 'New scope',
      managerId: 'other',
      status: 'archived',
      links: [{ label: 'Repo', url: 'https://github.com/softbee/atlas' }]
    });
  });

  it('sends nothing to read-only viewers', () => {
    expect(getProjectChanges(updateValues, [])).toEqual({});
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
