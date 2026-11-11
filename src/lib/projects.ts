import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth';
import type { ProjectStatus } from '@/lib/api/projects';
import { toSafeExternalUrl } from '@/lib/crew';
import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectLink, ProjectRecord, ProjectViewer } from '@/mocks/projects.mock';

export function getProjectsPermissions(role: UserRole): ProjectsPermissions {
  return PROJECTS_PERMISSIONS[role];
}

// Admin owns the whole space, a manager only the projects they are responsible for,
// staff only read the projects they are assigned to
export function getProjectAccess(project: ProjectRecord, viewer: ProjectViewer): ProjectAccess {
  const isAdmin = viewer.role === 'admin';
  const isResponsibleManager = viewer.role === 'manager' && project.managerId === viewer.id;
  const canEdit = isAdmin || isResponsibleManager;

  return {
    canEdit,
    editableFields: isAdmin ? ADMIN_FIELDS : isResponsibleManager ? MANAGER_FIELDS : [],
    canManageMembers: canEdit,
    canChangeStatus: isAdmin,
    canViewTeamTime: canEdit
  };
}

export function getVisibleProjects(projects: ProjectRecord[], viewer: ProjectViewer): ProjectRecord[] {
  if (viewer.role === 'admin') {
    return projects;
  }

  if (viewer.role === 'manager') {
    return projects.filter((project) => project.managerId === viewer.id);
  }

  return projects.filter((project) => project.memberIds.includes(viewer.id));
}

export function filterProjects(projects: ProjectRecord[], filters: ProjectFilters): ProjectRecord[] {
  const query = filters.query.trim().toLowerCase();

  return projects
    .filter((project) => project.status === filters.status)
    .filter((project) => !query || `${project.name} ${project.description}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Managers may only bring in active people from their own team; anyone else needs an admin
export function getAddableMembers(project: ProjectRecord, crew: CrewMember[], viewer: ProjectViewer): CrewMember[] {
  return crew
    .filter((member) => member.status === 'active' && !project.memberIds.includes(member.id))
    .filter((member) => viewer.role === 'admin' || member.managerId === viewer.id)
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export function getManagerCandidates(crew: CrewMember[]): CrewMember[] {
  return crew
    .filter((member) => member.status === 'active' && (member.role === 'manager' || member.role === 'admin'))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export function summarizeProjectTime(project: ProjectRecord, viewer: ProjectViewer): ProjectTimeSummary {
  if (getProjectAccess(project, viewer).canViewTeamTime) {
    return { minutes: sumMinutes(Object.values(project.weekMinutesByMember)), scope: 'team' };
  }

  return { minutes: project.weekMinutesByMember[viewer.id] ?? 0, scope: 'own' };
}

export function getShortName(person: Pick<CrewMember, 'firstName' | 'lastName'>): string {
  const initial = person.lastName.trim().charAt(0);

  return initial ? `${person.firstName} ${initial}.` : person.firstName;
}

export function isProjectNameTaken(projects: ProjectRecord[], name: string, exceptId?: string): boolean {
  const normalized = name.trim().toLowerCase();

  return projects.some((project) => project.id !== exceptId && project.name.trim().toLowerCase() === normalized);
}

export function createProjectRecord(input: CreateProjectValues, id: string): ProjectRecord {
  return {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    managerId: input.managerId,
    status: 'active',
    memberIds: [input.managerId],
    links: [],
    weekMinutesByMember: {},
    version: 1
  };
}

// Applies only the fields the viewer may change, and refuses to overwrite a newer version
export function applyProjectUpdate(
  project: ProjectRecord,
  values: ProjectUpdateValues,
  baseVersion: number,
  editableFields: ProjectField[]
): ProjectUpdateResult {
  if (project.version !== baseVersion) {
    return { status: 'conflict', project };
  }

  const changes: Partial<ProjectRecord> = {};

  for (const field of editableFields) {
    if (field === 'links') {
      changes.links = values.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
    } else if (field === 'status') {
      changes.status = values.status;
    } else {
      changes[field] = values[field].trim();
    }
  }

  const managerId = changes.managerId ?? project.managerId;
  // the responsible manager is always a member; changing them leaves other projects untouched
  const memberIds = project.memberIds.includes(managerId) ? project.memberIds : [managerId, ...project.memberIds];

  return { status: 'saved', project: { ...project, ...changes, memberIds, version: project.version + 1 } };
}

export function removeProjectMember(project: ProjectRecord, memberId: string): ProjectRecord {
  if (memberId === project.managerId) {
    return project;
  }

  return { ...project, memberIds: project.memberIds.filter((id) => id !== memberId) };
}

export function addProjectMember(project: ProjectRecord, memberId: string): ProjectRecord {
  return project.memberIds.includes(memberId) ? project : { ...project, memberIds: [...project.memberIds, memberId] };
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

function sumMinutes(values: number[]): number {
  return values.reduce((sum, minutes) => sum + minutes, 0);
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

const ADMIN_FIELDS: ProjectField[] = ['name', 'description', 'managerId', 'status', 'links'];
const MANAGER_FIELDS: ProjectField[] = ['description', 'links'];

// Creating projects is a separate grant for managers; every manager holds it until
// per-person grants exist
const PROJECTS_PERMISSIONS: Record<UserRole, ProjectsPermissions> = {
  admin: { canCreate: true, canChooseManager: true },
  manager: { canCreate: true, canChooseManager: false },
  worker: { canCreate: false, canChooseManager: false }
};

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = { query: '', status: 'active' };

export type ProjectField = 'name' | 'description' | 'managerId' | 'status' | 'links';

export type ProjectView = 'details' | 'edit';

export type DescriptionBlock = { type: 'paragraph'; text: string } | { type: 'list'; ordered: boolean; items: string[] };

export type ProjectUpdateResult = { status: 'saved'; project: ProjectRecord } | { status: 'conflict'; project: ProjectRecord };

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
  description: string;
  managerId: string;
}

export interface ProjectUpdateValues {
  name: string;
  description: string;
  managerId: string;
  status: ProjectStatus;
  links: ProjectLink[];
}
