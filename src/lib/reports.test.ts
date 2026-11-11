import { describe, expect, it } from 'vitest';

import {
  buildReport,
  buildReportSearch,
  findPeriodPreset,
  formatPeriodHeading,
  getReportOptions,
  getTodayKey,
  parseReportFilters,
  resolvePeriodPreset,
  type ReportData,
  type ReportFilters
} from '@/lib/reports';
import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectRecord } from '@/mocks/projects.mock';

describe('resolvePeriodPreset', () => {
  it('uses Monday-based weeks', () => {
    expect(resolvePeriodPreset('this-week', '2026-11-11')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(resolvePeriodPreset('last-week', '2026-11-11')).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });

  it('resolves calendar months', () => {
    expect(resolvePeriodPreset('this-month', '2026-11-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(resolvePeriodPreset('last-month', '2026-11-11')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('recognises a range that matches a preset', () => {
    expect(findPeriodPreset({ from: '2026-11-01', to: '2026-11-30' }, '2026-11-11')).toBe('this-month');
    expect(findPeriodPreset({ from: '2026-11-03', to: '2026-11-05' }, '2026-11-11')).toBeNull();
  });
});

describe('getTodayKey', () => {
  it('reads the date in the given time zone', () => {
    const now = new Date('2026-11-11T23:30:00Z');

    expect(getTodayKey('UTC', now)).toBe('2026-11-11');
    expect(getTodayKey('Europe/Kyiv', now)).toBe('2026-11-12');
  });
});

describe('parseReportFilters', () => {
  it('defaults to this week with absences shown', () => {
    expect(parseReportFilters({}, '2026-11-11')).toEqual({
      from: '2026-11-09',
      to: '2026-11-15',
      projectIds: [],
      memberIds: [],
      showAbsence: true
    });
  });

  it('reads an explicit range, ids and the absence toggle', () => {
    expect(
      parseReportFilters({ from: '2026-11-02', to: '2026-11-04', projects: 'p1,p2,p1', members: 'u3', absence: '0' }, '2026-11-11')
    ).toEqual({
      from: '2026-11-02',
      to: '2026-11-04',
      projectIds: ['p1', 'p2'],
      memberIds: ['u3'],
      showAbsence: false
    });
  });

  it('applies the project from a project report link', () => {
    expect(parseReportFilters({ period: 'this-week', projects: 'p1' }, '2026-11-11')).toMatchObject({
      from: '2026-11-09',
      to: '2026-11-15',
      projectIds: ['p1'],
      memberIds: []
    });
  });

  it('keeps links from Crew and Projects working', () => {
    expect(parseReportFilters({ period: 'last-month', members: 'u3,u4' }, '2026-11-11')).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
      memberIds: ['u3', 'u4']
    });
  });

  it('falls back to the default period for a reversed or malformed range', () => {
    expect(parseReportFilters({ from: '2026-11-10', to: '2026-11-01' }, '2026-11-11')).toMatchObject({ from: '2026-11-09' });
    expect(parseReportFilters({ from: 'yesterday', to: '2026-11-01' }, '2026-11-11')).toMatchObject({ from: '2026-11-09' });
  });

  it('round-trips through the search string', () => {
    const filters: ReportFilters = {
      from: '2026-11-02',
      to: '2026-11-04',
      projectIds: ['p1'],
      memberIds: ['u3', 'u4'],
      showAbsence: false
    };
    const search = Object.fromEntries(new URLSearchParams(buildReportSearch(filters)));

    expect(parseReportFilters(search, '2026-11-11')).toEqual(filters);
  });
});

describe('formatPeriodHeading', () => {
  it('compresses ranges inside one month', () => {
    expect(formatPeriodHeading({ from: '2026-11-09', to: '2026-11-15' })).toBe('9–15 Nov 2026');
  });

  it('spells out ranges across months and years', () => {
    expect(formatPeriodHeading({ from: '2026-10-26', to: '2026-11-01' })).toBe('26 Oct – 1 Nov 2026');
    expect(formatPeriodHeading({ from: '2025-12-29', to: '2026-01-04' })).toBe('29 Dec 2025 – 4 Jan 2026');
  });
});

describe('getReportOptions', () => {
  it('gives admins everyone and every project', () => {
    const options = getReportOptions(ADMIN, DATA);

    expect(options.people.map((person) => person.name)).toEqual(['Alex S.', 'Anastasia P.', 'Mark B.', 'Olena K.', 'Zoe O.']);
    expect(options.projects.map((project) => project.id)).toEqual(['p2', 'p1', 'p3']);
    expect(options.canChoosePeople).toBe(true);
  });

  it('limits managers to their team and the projects they run or staff', () => {
    const options = getReportOptions(MANAGER, DATA);

    expect(options.people.map((person) => person.id).sort()).toEqual(['u2', 'u3', 'u4']);
    expect(options.projects.map((project) => project.id).sort()).toEqual(['p1', 'p2']);
  });

  it('gives staff only themselves', () => {
    const options = getReportOptions(STAFF, DATA);

    expect(options.people.map((person) => person.id)).toEqual(['u3']);
    expect(options.projects.map((project) => project.id)).toEqual(['p2', 'p1']);
    expect(options.canChoosePeople).toBe(false);
  });
});

describe('buildReport', () => {
  it('groups time by person and project and totals the same records', () => {
    const report = buildReport(DATA, FILTERS, ADMIN);

    expect(report.rows.map((row) => [row.memberName, row.projectName, row.minutes])).toEqual([
      ['Alex S.', 'Fast Quote', 480],
      ['Alex S.', 'Fundayo', 480],
      ['Anastasia P.', 'Fundayo', 480],
      ['Olena K.', 'Internal', 240],
      ['Zoe O.', null, 0]
    ]);
    expect(report.totals.minutes).toBe(report.rows.reduce((sum, row) => sum + row.minutes, 0));
  });

  it('puts a person’s absence on their first row only and counts working days in range', () => {
    const report = buildReport(DATA, FILTERS, ADMIN);
    const anastasia = report.rows.filter((row) => row.memberId === 'u4');

    expect(anastasia[0].absence).toEqual({ days: 1, vacationDays: 1, sickDays: 0 });
    expect(report.totals.absence).toEqual({ days: 3, vacationDays: 1, sickDays: 2 });
    expect(report.rows.filter((row) => row.absence).length).toBe(3);
  });

  it('adds a row for someone with absence but no tracked time', () => {
    const report = buildReport(DATA, FILTERS, ADMIN);

    expect(report.rows.find((row) => row.memberId === 'u9')).toMatchObject({ projectName: null, minutes: 0, absence: { days: 1 } });
  });

  it('keeps worked time unchanged when absences are hidden', () => {
    const shown = buildReport(DATA, FILTERS, ADMIN);
    const hidden = buildReport(DATA, { ...FILTERS, showAbsence: false }, ADMIN);

    expect(hidden.totals.minutes).toBe(shown.totals.minutes);
    expect(hidden.totals.absence.days).toBe(0);
    expect(hidden.rows.every((row) => row.absence === null)).toBe(true);
  });

  it('lets a manager see their team and the projects they run, nothing else', () => {
    const report = buildReport(DATA, FILTERS, MANAGER);

    expect(new Set(report.rows.map((row) => row.memberId))).toEqual(new Set(['u3', 'u4']));
    expect(report.rows.some((row) => row.projectId === 'p3')).toBe(false);
  });

  it('drops people and projects outside the viewer’s scope even when requested directly', () => {
    const report = buildReport(DATA, { ...FILTERS, memberIds: ['u1', 'u3'], projectIds: ['p3', 'p1'] }, MANAGER);

    expect(report.filters.memberIds).toEqual(['u3']);
    expect(report.filters.projectIds).toEqual(['p1']);
    expect(report.rows.every((row) => row.memberId === 'u3' && row.projectId === 'p1')).toBe(true);
  });

  it('returns nothing when every requested project is outside the viewer’s scope', () => {
    const report = buildReport(DATA, { ...FILTERS, projectIds: ['p3'] }, MANAGER);

    expect(report.filters.projectIds).toEqual(['p3']);
    expect(report.rows).toEqual([]);
    expect(report.totals.minutes).toBe(0);
  });

  it('ignores a people filter from staff and returns only their own data', () => {
    const report = buildReport(DATA, { ...FILTERS, memberIds: ['u4'] }, STAFF);

    expect(report.filters.memberIds).toEqual([]);
    expect(report.rows.every((row) => row.memberId === 'u3')).toBe(true);
    expect(report.totals.minutes).toBe(960);
  });

  it('limits absences to people on the selected projects', () => {
    const report = buildReport(DATA, { ...FILTERS, projectIds: ['p2'] }, ADMIN);

    expect(report.rows.map((row) => row.memberId)).toEqual(['u3']);
    expect(report.totals.absence.days).toBe(0);
  });

  it('keeps a person’s own history after they leave a project', () => {
    const removed: ReportData = {
      ...DATA,
      projects: DATA.projects.map((item) => (item.id === 'p2' ? { ...item, memberIds: [] } : item))
    };

    expect(getReportOptions(STAFF, removed).projects.map((item) => item.id)).toContain('p2');
    expect(buildReport(removed, { ...FILTERS, projectIds: ['p2'] }, STAFF).totals.minutes).toBe(480);
  });

  it('keeps time of people who left a project the manager runs', () => {
    const left: ReportData = {
      ...DATA,
      crew: DATA.crew.map((person) => (person.id === 'u4' ? { ...person, managerId: 'u1' } : person)),
      projects: DATA.projects.map((item) => (item.id === 'p1' ? { ...item, memberIds: ['u2', 'u3'] } : item))
    };

    expect(buildReport(left, FILTERS, MANAGER).rows.some((row) => row.memberId === 'u4')).toBe(true);
  });

  it('returns an empty report outside the recorded range', () => {
    const report = buildReport(DATA, { ...FILTERS, from: '2025-01-01', to: '2025-01-07' }, ADMIN);

    expect(report.rows).toEqual([]);
    expect(report.totals.minutes).toBe(0);
  });
});

function member(id: string, firstName: string, lastName: string, managerId: string | null, role: CrewMember['role']): CrewMember {
  return {
    id,
    firstName,
    lastName,
    email: `${id}@example.com`,
    role,
    position: 'Engineer',
    status: 'active',
    phone: null,
    linkedin: null,
    upwork: null,
    employmentDate: null,
    managerId,
    projects: [],
    weekMinutesByProject: {},
    monthMinutes: 0
  };
}

function project(id: string, name: string, managerId: string, memberIds: string[]): ProjectRecord {
  return { id, name, description: '', managerId, status: 'active', memberIds, links: [], weekMinutesByMember: {}, version: 1 };
}

const ADMIN = { id: 'u1', role: 'admin' } as const;
const MANAGER = { id: 'u2', role: 'manager' } as const;
const STAFF = { id: 'u3', role: 'worker' } as const;

const DATA: ReportData = {
  crew: [
    member('u1', 'Olena', 'Koval', null, 'admin'),
    member('u2', 'Mark', 'Bee', 'u1', 'manager'),
    member('u3', 'Alex', 'Smith', 'u2', 'worker'),
    member('u4', 'Anastasia', 'Petrenko', 'u2', 'worker'),
    member('u9', 'Zoe', 'Outsider', 'u1', 'worker')
  ],
  projects: [
    project('p1', 'Fundayo', 'u2', ['u2', 'u3', 'u4']),
    project('p2', 'Fast Quote', 'u1', ['u3']),
    project('p3', 'Internal', 'u1', ['u1'])
  ],
  entries: [
    { id: 'e1', memberId: 'u3', projectId: 'p1', date: '2026-11-09', minutes: 240 },
    { id: 'e2', memberId: 'u3', projectId: 'p1', date: '2026-11-10', minutes: 240 },
    { id: 'e3', memberId: 'u4', projectId: 'p1', date: '2026-11-09', minutes: 480 },
    { id: 'e4', memberId: 'u3', projectId: 'p2', date: '2026-11-11', minutes: 480 },
    { id: 'e5', memberId: 'u1', projectId: 'p3', date: '2026-11-11', minutes: 240 },
    { id: 'e6', memberId: 'u3', projectId: 'p1', date: '2026-11-02', minutes: 999 }
  ],
  absences: [
    { id: 'a1', memberId: 'u4', leaveType: 'vacation', startDate: '2026-11-10', endDate: '2026-11-10' },
    // the weekend days do not count
    { id: 'a2', memberId: 'u1', leaveType: 'sick_leave', startDate: '2026-11-13', endDate: '2026-11-15' },
    { id: 'a3', memberId: 'u9', leaveType: 'sick_leave', startDate: '2026-11-12', endDate: '2026-11-12' },
    { id: 'a4', memberId: 'u4', leaveType: 'vacation', startDate: '2026-11-01', endDate: '2026-11-06' }
  ]
};

const FILTERS: ReportFilters = { from: '2026-11-09', to: '2026-11-15', projectIds: [], memberIds: [], showAbsence: true };
