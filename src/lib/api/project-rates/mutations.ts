import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

import { mapProjectRateRowToProjectRate, mapProjectRateToProjectRateRow } from './mappers';
import type { CreateProjectRateInput, ProjectRate } from './types';

export async function createProjectRate(input: CreateProjectRateInput): Promise<ProjectRate> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('project_rates').insert(mapProjectRateToProjectRateRow(input)).select('*').single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectRateRowToProjectRate(data);
}
