import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

import { mapProjectRateRowsToProjectRates, PROJECT_RATE_COLUMNS } from './mappers';
import type { ProjectRate } from './types';

export async function getProjectRates(): Promise<ProjectRate[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('project_rates').select(PROJECT_RATE_COLUMNS);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectRateRowsToProjectRates(data);
}
