import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';

import type { UserRole } from '@/lib/api/auth';
import type { LeaveType } from '@/lib/api/leave';
import type { ProjectRecord } from '@/lib/api/projects';
import type { ReportSource, ReportTimeEntry } from '@/lib/api/reports';
import type { ProjectPerson } from '@/lib/api/users';
import { getLeaveWorkingDays } from '@/lib/leave-days';
import { getShortName } from '@/lib/projects';
import { isReportPeriod, REPORT_PERIODS, type ReportPeriod } from '@/lib/team-report-params';
import { toDateKey } from '@/lib/tracker-days';

export function getTodayKey(timeZone: string, now: Date): string {
  // en-CA formats as yyyy-MM-dd
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function resolvePeriodPreset(preset: ReportPeriod, todayKey: string): ReportRange {
  const today = parseISO(todayKey);

  if (preset === 'this-week' || preset === 'last-week') {
    const anchor = preset === 'this-week' ? today : addDays(today, -7);

    return toRange(startOfWeek(anchor, WEEK_OPTIONS), endOfWeek(anchor, WEEK_OPTIONS));
  }

  const anchor = preset === 'this-month' ? today : subMonths(today, 1);

  return toRange(startOfMonth(anchor), endOfMonth(anchor));
}

export function findPeriodPreset(range: ReportRange, todayKey: string): ReportPeriod | null {
  return (
    REPORT_PERIODS.find((preset) => {
      const presetRange = resolvePeriodPreset(preset, todayKey);

      return presetRange.from === range.from && presetRange.to === range.to;
    }) ?? null
  );
}

export function parseReportFilters(searchParams: ReportSearchParams, todayKey: string): ReportFilters {
  const period = firstValue(searchParams.period);
  const range = parseRange(firstValue(searchParams.from), firstValue(searchParams.to));

  return {
    ...(range ?? resolvePeriodPreset(isReportPeriod(period) ? period : DEFAULT_PERIOD, todayKey)),
    projectIds: parseIds(firstValue(searchParams.projects)),
    memberIds: parseIds(firstValue(searchParams.members)),
    showAbsence: firstValue(searchParams.absence) !== '0'
  };
}

export function buildReportSearch(filters: ReportFilters): string {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });

  if (filters.projectIds.length > 0) {
    params.set('projects', filters.projectIds.join(','));
  }

  if (filters.memberIds.length > 0) {
    params.set('members', filters.memberIds.join(','));
  }

  if (!filters.showAbsence) {
    params.set('absence', '0');
  }

  return `?${params.toString()}`;
}

// Admin sees the whole space, a manager the people and time on the projects they manage, staff only themselves.
// It mirrors the trackers RLS, which already limits the entries; the scope also limits the filter options.
// Every report is built through this scope, so ids outside it are dropped even if requested directly.
// Past entries stay visible after someone leaves a project, so their projects and people are added too
export function getReportScope(viewer: ReportViewer, data: ReportData): ReportScope {
  const scope = getAssignmentScope(viewer, data);

  for (const entry of data.entries) {
    if (scope.canSeeEntry(entry)) {
      scope.memberIds.add(entry.memberId);
      scope.projectIds.add(entry.projectId);
    }
  }

  return scope;
}

function getAssignmentScope(viewer: ReportViewer, data: ReportData): ReportScope {
  if (viewer.role === 'admin') {
    return {
      memberIds: new Set(data.people.map((person) => person.id)),
      projectIds: new Set(data.projects.map((project) => project.id)),
      canSeeEntry: () => true
    };
  }

  const ownProjects = data.projects.filter((project) => isOnProject(project, viewer.id));
  const ownProjectIds = new Set(ownProjects.map((project) => project.id));

  // a manager manages every project they are responsible for or assigned to (private.is_project_manager)
  if (viewer.role === 'manager') {
    return {
      memberIds: new Set([viewer.id, ...ownProjects.flatMap((project) => project.memberIds)]),
      projectIds: ownProjectIds,
      canSeeEntry: (entry) => entry.memberId === viewer.id || ownProjectIds.has(entry.projectId)
    };
  }

  return {
    memberIds: new Set([viewer.id]),
    projectIds: ownProjectIds,
    canSeeEntry: (entry) => entry.memberId === viewer.id
  };
}

function isOnProject(project: ProjectRecord, personId: string): boolean {
  return project.managerId === personId || project.memberIds.includes(personId);
}

export function getReportOptions(viewer: ReportViewer, data: ReportData): ReportOptions {
  const scope = getReportScope(viewer, data);

  return {
    people: data.people
      .filter((person) => scope.memberIds.has(person.id))
      .map((person) => ({ id: person.id, name: getShortName(person) }))
      .sort(byName),
    projects: data.projects
      .filter((project) => scope.projectIds.has(project.id))
      .map((project) => ({ id: project.id, name: project.name }))
      .sort(byName),
    canChoosePeople: viewer.role !== 'worker'
  };
}

// Rows, totals and exports all come from this one pass over the records, so they always agree.
// Entries are already summed for the requested range, so only scope and selection filter them here
export function buildReport(data: ReportData, requested: ReportFilters, viewer: ReportViewer): Report {
  const scope = getReportScope(viewer, data);
  const filters: ReportFilters = {
    ...requested,
    projectIds: narrowToScope(requested.projectIds, scope.projectIds),
    memberIds: viewer.role === 'worker' ? [] : narrowToScope(requested.memberIds, scope.memberIds)
  };
  const selectedProjects = filters.projectIds.length > 0 ? new Set(filters.projectIds.filter((id) => scope.projectIds.has(id))) : null;
  const selectedMembers = filters.memberIds.length > 0 ? new Set(filters.memberIds.filter((id) => scope.memberIds.has(id))) : null;

  const entries = data.entries.filter(
    (entry) =>
      scope.canSeeEntry(entry) &&
      (!selectedProjects || selectedProjects.has(entry.projectId)) &&
      (!selectedMembers || selectedMembers.has(entry.memberId))
  );

  // toggling absences never touches the worked-time entries above
  const absenceByMember = filters.showAbsence
    ? sumAbsences(data, filters, scope, selectedMembers, selectedProjects)
    : new Map<string, ReportAbsenceSummary>();
  const rows = buildRows(entries, absenceByMember, data);

  return {
    filters,
    rows,
    totals: {
      minutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
      absence: sumAbsenceTotals([...absenceByMember.values()])
    }
  };
}

// Out-of-scope ids are dropped. If none are left, the selection is kept as is so it matches
// nothing: an empty selection would mean "all" and widen the report instead of narrowing it
function narrowToScope(ids: string[], allowed: Set<string>): string[] {
  const inScope = ids.filter((id) => allowed.has(id));

  return inScope.length > 0 ? inScope : ids;
}

export function formatPeriodHeading({ from, to }: ReportRange): string {
  const start = parseISO(from);
  const end = parseISO(to);

  if (from === to) {
    return format(start, 'd MMM yyyy');
  }

  if (format(start, 'yyyy-MM') === format(end, 'yyyy-MM')) {
    return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }

  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

export function formatPeriodShort({ from, to }: ReportRange): string {
  const start = parseISO(from);
  const end = parseISO(to);
  const pattern = start.getFullYear() === end.getFullYear() ? 'd MMM' : 'd MMM yyyy';

  return from === to ? format(start, pattern) : `${format(start, pattern)} – ${format(end, pattern)}`;
}

export function getDefaultFilters(todayKey: string): ReportFilters {
  return { ...resolvePeriodPreset(DEFAULT_PERIOD, todayKey), projectIds: [], memberIds: [], showAbsence: true };
}

export function isValidRange({ from, to }: ReportRange): boolean {
  return parseRange(from, to) !== null;
}

export function describeSelection(ids: string[], options: ReportOption[], allLabel: string): string {
  const names = options.filter((option) => ids.includes(option.id)).map((option) => option.name);

  return names.length > 0 ? names.join(', ') : allLabel;
}

export function isSameFilters(a: ReportFilters, b: ReportFilters): boolean {
  return buildReportSearch(normalizeFilters(a)) === buildReportSearch(normalizeFilters(b));
}

function normalizeFilters(filters: ReportFilters): ReportFilters {
  return { ...filters, projectIds: [...filters.projectIds].sort(), memberIds: [...filters.memberIds].sort() };
}

function sumAbsences(
  data: ReportData,
  filters: ReportFilters,
  scope: ReportScope,
  selectedMembers: Set<string> | null,
  selectedProjects: Set<string> | null
): Map<string, ReportAbsenceSummary> {
  // with a project filter, only people on those projects are relevant
  const projectMembers = selectedProjects
    ? new Set(data.projects.filter((project) => selectedProjects.has(project.id)).flatMap((project) => project.memberIds))
    : null;
  const totals = new Map<string, ReportAbsenceSummary>();

  for (const absence of data.absences) {
    const isVisible =
      scope.memberIds.has(absence.memberId) &&
      (!selectedMembers || selectedMembers.has(absence.memberId)) &&
      (!projectMembers || projectMembers.has(absence.memberId));

    if (!isVisible) {
      continue;
    }

    const days = getLeaveWorkingDays(absence.startDate, absence.endDate).filter((day) => day >= filters.from && day <= filters.to).length;

    if (days === 0) {
      continue;
    }

    const current = totals.get(absence.memberId) ?? { days: 0, vacationDays: 0, sickDays: 0 };

    totals.set(absence.memberId, addAbsenceDays(current, absence.leaveType, days));
  }

  return totals;
}

function addAbsenceDays(summary: ReportAbsenceSummary, leaveType: LeaveType, days: number): ReportAbsenceSummary {
  return {
    days: summary.days + days,
    vacationDays: summary.vacationDays + (leaveType === 'vacation' ? days : 0),
    sickDays: summary.sickDays + (leaveType === 'sick_leave' ? days : 0)
  };
}

function sumAbsenceTotals(summaries: ReportAbsenceSummary[]): ReportAbsenceSummary {
  return summaries.reduce(
    (total, summary) => ({
      days: total.days + summary.days,
      vacationDays: total.vacationDays + summary.vacationDays,
      sickDays: total.sickDays + summary.sickDays
    }),
    { days: 0, vacationDays: 0, sickDays: 0 }
  );
}

// One row per person and project. A person's absence sits on their first row only,
// so the absence column adds up to the total; people with only absence get a row of their own.
function buildRows(entries: ReportTimeEntry[], absenceByMember: Map<string, ReportAbsenceSummary>, data: ReportData): ReportRow[] {
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const projectsById = new Map(data.projects.map((project) => [project.id, project]));
  const minutesByKey = new Map<string, Pick<ReportTimeEntry, 'memberId' | 'projectId' | 'minutes'>>();

  for (const entry of entries) {
    const key = `${entry.memberId}:${entry.projectId}`;
    const current = minutesByKey.get(key);

    minutesByKey.set(key, { memberId: entry.memberId, projectId: entry.projectId, minutes: (current?.minutes ?? 0) + entry.minutes });
  }

  const timeRows = [...minutesByKey.values()].map((item) => ({
    id: `${item.memberId}:${item.projectId}`,
    memberId: item.memberId,
    memberName: getMemberName(peopleById.get(item.memberId)),
    projectId: item.projectId,
    projectName: projectsById.get(item.projectId)?.name ?? null,
    minutes: item.minutes,
    absence: null
  }));
  const membersWithTime = new Set(timeRows.map((row) => row.memberId));
  const absenceOnlyRows = [...absenceByMember.keys()]
    .filter((memberId) => !membersWithTime.has(memberId))
    .map((memberId) => ({
      id: `${memberId}:absence`,
      memberId,
      memberName: getMemberName(peopleById.get(memberId)),
      projectId: null,
      projectName: null,
      minutes: 0,
      absence: null
    }));

  const sorted: ReportRow[] = [...timeRows, ...absenceOnlyRows].sort(
    (a, b) =>
      a.memberName.localeCompare(b.memberName) ||
      a.memberId.localeCompare(b.memberId) ||
      (a.projectName ?? '').localeCompare(b.projectName ?? '')
  );
  const seen = new Set<string>();

  return sorted.map((row) => {
    if (seen.has(row.memberId)) {
      return row;
    }

    seen.add(row.memberId);

    return { ...row, absence: absenceByMember.get(row.memberId) ?? null };
  });
}

function getMemberName(person: ProjectPerson | undefined): string {
  return person ? getShortName(person) : UNKNOWN_MEMBER;
}

function parseRange(from: string | undefined, to: string | undefined): ReportRange | null {
  if (!from || !to || !DATE_KEY_PATTERN.test(from) || !DATE_KEY_PATTERN.test(to)) {
    return null;
  }

  const start = parseISO(from);
  const end = parseISO(to);

  if (!isValid(start) || !isValid(end) || end < start || differenceInCalendarDays(end, start) > MAX_RANGE_DAYS) {
    return null;
  }

  return { from, to };
}

function parseIds(value: string | undefined): string[] {
  return value
    ? [
        ...new Set(
          value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        )
      ]
    : [];
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toRange(start: Date, end: Date): ReportRange {
  return { from: toDateKey(start), to: toDateKey(end) };
}

function byName(a: ReportOption, b: ReportOption): number {
  return a.name.localeCompare(b.name);
}

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MAX_RANGE_DAYS = 366;

const UNKNOWN_MEMBER = 'Unknown';

export const DEFAULT_PERIOD: ReportPeriod = 'this-week';

export type ReportSearchParams = Record<string, string | string[] | undefined>;

export interface ReportRange {
  from: string;
  to: string;
}

export interface ReportFilters extends ReportRange {
  projectIds: string[];
  memberIds: string[];
  showAbsence: boolean;
}

export interface ReportViewer {
  id: string;
  role: UserRole;
}

// entries and absences cover the report's from–to range
export type ReportData = ReportSource;

export interface ReportScope {
  memberIds: Set<string>;
  projectIds: Set<string>;
  canSeeEntry: (entry: ReportTimeEntry) => boolean;
}

export interface ReportOption {
  id: string;
  name: string;
}

export interface ReportOptions {
  people: ReportOption[];
  projects: ReportOption[];
  canChoosePeople: boolean;
}

export interface ReportAbsenceSummary {
  days: number;
  vacationDays: number;
  sickDays: number;
}

export interface ReportRow {
  id: string;
  memberId: string;
  memberName: string;
  projectId: string | null;
  projectName: string | null;
  minutes: number;
  absence: ReportAbsenceSummary | null;
}

export interface Report {
  filters: ReportFilters;
  rows: ReportRow[];
  totals: {
    minutes: number;
    absence: ReportAbsenceSummary;
  };
}
