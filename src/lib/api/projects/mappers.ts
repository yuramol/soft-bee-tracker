import type { Database } from '@/types';
import { Project } from './types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description || null,
    note: row.note || null,
    pictureUrl: row.picture_url || null,
    client: row.client || null,
    status: row.status,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    managerId: row.manager_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
