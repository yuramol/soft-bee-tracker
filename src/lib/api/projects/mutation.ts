import { createBrowserClient } from '@/lib/supabase/client';
import { CreateProjectRequest, Project, mapProjectRow } from '.';
import type { ApiError } from '@/types/api-error';

export async function createProject(params: CreateProjectRequest): Promise<Project> {
  const supabase = createBrowserClient();

  // metadata keys mirror public.users columns so the handle_new_user trigger maps them 1:1;
  // role/is_confirmed/is_blocked are server-enforced by the trigger regardless of these values
  const metadata = {
    name: params.name,
    description: params.description ?? null,
    note: params.note ?? null,
    type: params.type,
    picture_url: params.pictureUrl || null,
    client: params.client || null,
    status: params.status,
    start_date: params.startDate || null,
    end_date: params.endDate || null,
    manager_id: params.managerId || null
  };

  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...metadata
    })
    .select('*')
    .single();

  if (error) {
    throw {
      message: error.message,
      statusCode: Number(error.code)
    } satisfies ApiError;
  }

  return mapProjectRow(data);
}
