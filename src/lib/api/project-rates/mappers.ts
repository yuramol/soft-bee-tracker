import type { Database } from '@/types';

import type { CreateProjectRateInput, ProjectRate } from './types';

type ProjectRateRow = Database['public']['Tables']['project_rates']['Row'];
type ProjectRateInsert = Database['public']['Tables']['project_rates']['Insert'];

export function mapProjectRateRowToProjectRate(row: ProjectRateRow): ProjectRate {
  return {
    projectId: row.project_id,
    userId: row.user_id,
    rate: row.rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapProjectRateRowsToProjectRates(rows: ProjectRateRow[]): ProjectRate[] {
  return rows.map(mapProjectRateRowToProjectRate);
}

export function mapProjectRateToProjectRateRow(projectRate: CreateProjectRateInput): ProjectRateInsert {
  return {
    project_id: projectRate.projectId,
    user_id: projectRate.userId,
    rate: projectRate.rate
  };
}
