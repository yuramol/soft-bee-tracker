import type { CreateProjectInput, Project } from '@/lib/api/projects/types';
import type { Database } from '@/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type InputProjectRow = Database['public']['Tables']['projects']['Insert'];

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
    managerId: row.manager_id
  };
}

export function mapProjectsRowsToProjects(rows: ProjectRow[]): Project[] {
  return rows.map(mapProjectRowToProject);
}

export function mapProjectToProjectRow(project: CreateProjectInput, managerId: string): InputProjectRow {
  return {
    name: project.name,
    client: project.client,
    note: project.note,
    picture_url: project.pictureUrl,
    start_date: project.startDate,
    end_date: project.endDate,
    type: project.type,
    manager_id: managerId
  };
}
