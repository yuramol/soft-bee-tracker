export type ProjectStatus = 'active' | 'archived';

export type ProjectType = 'fixed_price' | 'non_profit' | 'time_material';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  pictureUrl: string | null;
  client: string | null;
  type: ProjectType;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRate {
  projectId: string;
  userId: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  type: ProjectType;
  description: string;
  note?: string;
  pictureUrl?: string;
  client?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  managerId?: string;
}

export interface UpdateProjectRequest {
  id: string;
  name?: string;
  type?: ProjectType;
  description?: string | null;
  note?: string | null;
  pictureUrl?: string | null;
  client?: string | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  managerId?: string | null;
}

export interface UpsertProjectRateRequest {
  projectId: string;
  userId: string;
  rate: number;
}

export interface DeleteProjectRateRequest {
  projectId: string;
  userId: string;
}
