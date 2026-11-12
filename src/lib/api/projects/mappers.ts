import type { CreateProjectInput, Project, ProjectLink, ProjectMember, ProjectRecord, UpdateProjectInput } from '@/lib/api/projects/types';
import type { Database } from '@/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type Json = ProjectRow['links'];
type CreateProjectArgs = Database['public']['Functions']['create_project']['Args'];
type UpdateProjectRow = Database['public']['Tables']['projects']['Update'];
type ProjectMemberRow = Database['public']['Functions']['get_project_members']['Returns'][number];

export const PROJECT_COLUMNS =
  'id, created_at, updated_at, name, client, note, picture_url, start_date, end_date, status, type, manager_id, links';

export function mapProjectRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    client: row.client,
    note: row.note,
    pictureUrl: row.picture_url,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    type: row.type,
    managerId: row.manager_id,
    links: parseProjectLinks(row.links)
  };
}

export function mapProjectsRowsToProjects(rows: ProjectRow[]): Project[] {
  return rows.map(mapProjectRowToProject);
}

export function mapProjectMemberRows(rows: ProjectMemberRow[]): ProjectMember[] {
  return rows.map((row) => ({ projectId: row.project_id, userId: row.user_id }));
}

export function toProjectRecords(projects: Project[], members: ProjectMember[]): ProjectRecord[] {
  const memberIdsByProject = new Map<string, string[]>();

  for (const member of members) {
    memberIdsByProject.set(member.projectId, [...(memberIdsByProject.get(member.projectId) ?? []), member.userId]);
  }

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    client: project.client,
    description: project.note ?? '',
    managerId: project.managerId,
    status: project.status,
    memberIds: memberIdsByProject.get(project.id) ?? [],
    links: project.links,
    updatedAt: project.updatedAt
  }));
}

export function mapCreateProjectArgs(project: CreateProjectInput): CreateProjectArgs {
  const note = toNote(project.description);

  return {
    project_name: project.name.trim(),
    responsible_id: project.managerId,
    project_client: project.client.trim(),
    manager_ids: project.managerIds.filter((id) => id !== project.managerId),
    ...(note ? { project_note: note } : {})
  };
}

export function mapProjectChangesToRow(changes: UpdateProjectInput['changes']): UpdateProjectRow {
  const row: UpdateProjectRow = {};

  if (changes.name !== undefined) {
    row.name = changes.name.trim();
  }

  if (changes.client !== undefined) {
    row.client = changes.client.trim();
  }

  if (changes.description !== undefined) {
    row.note = toNote(changes.description);
  }

  if (changes.managerId !== undefined) {
    row.manager_id = changes.managerId;
  }

  if (changes.status !== undefined) {
    row.status = changes.status;
  }

  if (changes.links !== undefined) {
    row.links = changes.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
  }

  return row;
}

function toNote(description: string): string | null {
  return description.trim() || null;
}

// links are written only through the validated project form; anything malformed is dropped
function parseProjectLinks(value: Json): ProjectLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return [];
    }

    const { label, url } = item;

    return typeof label === 'string' && typeof url === 'string' ? [{ label, url }] : [];
  });
}
