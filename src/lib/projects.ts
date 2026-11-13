import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth';
import type { ProjectLink, ProjectRecord, ProjectStatus, UpdateProjectInput } from '@/lib/api/projects';
import type { Tracker } from '@/lib/api/trackers';
import type { ProjectPerson } from '@/lib/api/users';
import { toSafeExternalUrl } from '@/lib/crew';
import { getTrackerMinutes } from '@/lib/tracker-days';

export function getProjectsPermissions(role: UserRole): ProjectsPermissions {
  return PROJECTS_PERMISSIONS[role];
}

// Admin owns the whole space; a manager manages every project they are responsible for or
// assigned to; staff only read the projects they are assigned to
export function getProjectAccess(project: ProjectRecord, viewer: ProjectViewer): ProjectAccess {
  const isAdmin = viewer.role === 'admin';
  const isProjectManager = viewer.role === 'manager' && (project.managerId === viewer.id || project.memberIds.includes(viewer.id));
  const canEdit = isAdmin || isProjectManager;

  return {
    canEdit,
    editableFields: canEdit ? PROJECT_FIELDS : [],
    canManageMembers: canEdit,
    canChangeStatus: canEdit,
    canViewTeamTime: canEdit
  };
}

// mirrors the projects select policy: admins see everything, everyone else the projects
// they are responsible for or assigned to
export function isProjectVisible(project: Pick<ProjectRecord, 'managerId' | 'memberIds'>, viewer: ProjectViewer): boolean {
  return viewer.role === 'admin' || project.managerId === viewer.id || project.memberIds.includes(viewer.id);
}

// only managers and admins may manage a project
export function canBeProjectManager(person: Pick<ProjectPerson, 'role'>): boolean {
  return person.role === 'manager' || person.role === 'admin';
}

export function getVisibleProjects(projects: ProjectRecord[], viewer: ProjectViewer): ProjectRecord[] {
  return projects.filter((project) => isProjectVisible(project, viewer));
}

export function filterProjects(projects: ProjectRecord[], filters: ProjectFilters): ProjectRecord[] {
  const query = filters.query.trim().toLowerCase();

  return projects
    .filter((project) => project.status === filters.status)
    .filter((project) => !query || `${project.name} ${project.description}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// people have no team in the backend yet, so any active person who isn't a member can be added
export function getAddableMembers(project: ProjectRecord, people: ProjectPerson[]): ProjectPerson[] {
  return people
    .filter((member) => member.status === 'active' && !project.memberIds.includes(member.id))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

// the responsible person first, everyone else in their existing order
export function getOrderedMembers(
  project: Pick<ProjectRecord, 'managerId' | 'memberIds'>,
  peopleById: Map<string, ProjectPerson>
): ProjectPerson[] {
  const members = project.memberIds.flatMap((id) => peopleById.get(id) ?? []);

  return [...members.filter((member) => member.id === project.managerId), ...members.filter((member) => member.id !== project.managerId)];
}

// active managers and admins, plus the people in keepIds (the viewer, the current responsible
// person) even when their account isn't active yet, so a preselected value is always listed
export function getManagerCandidates(people: ProjectPerson[], keepIds: Array<string | null> = []): ProjectPerson[] {
  return people
    .filter((member) => canBeProjectManager(member) && (member.status === 'active' || keepIds.includes(member.id)))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

// rejected entries don't count, the same as in the tracker summary
export function summarizeProjectTime(project: ProjectRecord, trackers: Tracker[], viewer: ProjectViewer, now: Date): ProjectTimeSummary {
  const scope = getProjectAccess(project, viewer).canViewTeamTime ? 'team' : 'own';
  const minutes = trackers
    .filter((tracker) => tracker.projectId === project.id && tracker.status !== 'rejected')
    .filter((tracker) => scope === 'team' || tracker.userId === viewer.id)
    .reduce((sum, tracker) => sum + getTrackerMinutes(tracker, now), 0);

  return { minutes, scope };
}

export function getShortName(person: Pick<ProjectPerson, 'firstName' | 'lastName'>): string {
  const initial = person.lastName.trim().charAt(0);

  return initial ? `${person.firstName} ${initial}.` : person.firstName;
}

export function isProjectNameTaken(projects: ProjectRecord[], name: string, exceptId?: string): boolean {
  const normalized = name.trim().toLowerCase();

  return projects.some((project) => project.id !== exceptId && project.name.trim().toLowerCase() === normalized);
}

// only the fields the viewer may change are sent to the server
export function getProjectChanges(values: ProjectUpdateValues, editableFields: ProjectField[]): UpdateProjectInput['changes'] {
  const changes: UpdateProjectInput['changes'] = {};

  for (const field of editableFields) {
    if (field === 'links') {
      changes.links = values.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
    } else if (field === 'status') {
      changes.status = values.status;
    } else {
      changes[field] = values[field].trim();
    }
  }

  return changes;
}

export function buildProjectHref(projectId?: string, view?: ProjectView): string {
  if (!projectId) {
    return ROUTES.PROJECTS;
  }

  const params = new URLSearchParams({ [PROJECT_PARAM]: projectId });

  if (view === 'edit') {
    params.set(VIEW_PARAM, 'edit');
  }

  return `${ROUTES.PROJECTS}?${params.toString()}`;
}

export function parseProjectParams(searchParams: Pick<URLSearchParams, 'get'>): ProjectParams {
  return {
    projectId: searchParams.get(PROJECT_PARAM),
    view: searchParams.get(VIEW_PARAM) === 'edit' ? 'edit' : 'details'
  };
}

// Paragraphs are separated by blank lines; lines starting with "-", "*" or "1." form lists
export function parseDescription(text: string): DescriptionBlock[] {
  return text.split(/\n\s*\n/).flatMap(parseDescriptionChunk);
}

function parseDescriptionChunk(chunk: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  }

  for (const line of chunk.split('\n').map((value) => value.trim())) {
    const numbered = NUMBERED_PATTERN.exec(line);
    const item = BULLET_PATTERN.exec(line)?.[1] ?? numbered?.[1];

    if (!line) {
      continue;
    }

    if (item === undefined) {
      paragraph.push(line);
      continue;
    }

    flushParagraph();
    const ordered = numbered !== null;
    const previous = blocks.at(-1);

    if (previous?.type === 'list' && previous.ordered === ordered) {
      previous.items.push(item);
    } else {
      blocks.push({ type: 'list', ordered, items: [item] });
    }
  }

  flushParagraph();

  return blocks;
}

export function getDescriptionSummary(text: string): string {
  const firstLine = text.split('\n').find((line) => line.trim()) ?? '';

  return firstLine.trim().replace(BULLET_PREFIX, '').replace(NUMBERED_PREFIX, '');
}

export function isWebUrl(value: string): boolean {
  return toSafeExternalUrl(value) !== null;
}

// Credentials in the URL itself or in well-known secret query/fragment params
export function hasSecretUrlParams(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }

  if (url.username || url.password) {
    return true;
  }

  const fragmentParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const keys = [...url.searchParams.keys(), ...fragmentParams.keys()];

  return keys.some((key) => SECRET_PARAM_PATTERN.test(key));
}

export function containsSecret(text: string): boolean {
  if (SECRET_TEXT_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  return (text.match(URL_IN_TEXT_PATTERN) ?? []).some(hasSecretUrlParams);
}

const PROJECT_PARAM = 'project';
const VIEW_PARAM = 'view';

const BULLET_PATTERN = /^[-*•]\s+(.+)$/;
const NUMBERED_PATTERN = /^\d+[.)]\s+(.+)$/;
const BULLET_PREFIX = /^[-*•]\s+/;
const NUMBERED_PREFIX = /^\d+[.)]\s+/;

const SECRET_PARAM_PATTERN =
  /^(token|access_token|id_token|refresh_token|auth|auth_token|api[_-]?key|apikey|key|secret|client_secret|password|passwd|pwd|sig|signature|x-amz-signature|x-amz-credential)$/i;

const SECRET_TEXT_PATTERNS: RegExp[] = [
  /\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)\s*[:=]\s*\S+/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_\w{20,}/,
  /\bxox[abprs]-[\w-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[\w-]{20,}/,
  /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/
];

const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s<>"']+/gi;

// the responsible manager edits a project exactly like an admin
const PROJECT_FIELDS: ProjectField[] = ['name', 'client', 'description', 'managerId', 'status', 'links'];

// Creating projects is a separate grant for managers; every manager holds it until
// per-person grants exist
const PROJECTS_PERMISSIONS: Record<UserRole, ProjectsPermissions> = {
  admin: { canCreate: true, canChooseManager: true },
  manager: { canCreate: true, canChooseManager: true },
  worker: { canCreate: false, canChooseManager: false }
};

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = { query: '', status: 'active' };

export type ProjectField = 'name' | 'client' | 'description' | 'managerId' | 'status' | 'links';

export type ProjectView = 'details' | 'edit';

// how a create or edit submit ended, so the form knows which message to show
export type ProjectSubmitOutcome = 'saved' | 'name-taken' | 'conflict' | 'failed';

export type DescriptionBlock = { type: 'paragraph'; text: string } | { type: 'list'; ordered: boolean; items: string[] };

export interface ProjectViewer {
  id: string;
  role: UserRole;
}

export interface ProjectsPermissions {
  canCreate: boolean;
  canChooseManager: boolean;
}

export interface ProjectAccess {
  canEdit: boolean;
  editableFields: ProjectField[];
  canManageMembers: boolean;
  canChangeStatus: boolean;
  canViewTeamTime: boolean;
}

export interface ProjectFilters {
  query: string;
  status: ProjectStatus;
}

export interface ProjectTimeSummary {
  minutes: number;
  scope: 'team' | 'own';
}

export interface ProjectParams {
  projectId: string | null;
  view: ProjectView;
}

export interface CreateProjectValues {
  name: string;
  client: string;
  description: string;
  managerId: string;
  managerIds: string[];
}

export interface ProjectUpdateValues {
  name: string;
  client: string;
  description: string;
  managerId: string;
  status: ProjectStatus;
  links: ProjectLink[];
}
