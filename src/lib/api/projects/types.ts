export type ProjectStatus = 'active' | 'archived';

export type ProjectType = 'fixed_price' | 'non_profit' | 'time_material';

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  client: string;
  note: string | null;
  pictureUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  type: ProjectType;
  managerId: string | null;
}

export type ProjectMembership = 'manager' | 'member';

export interface MemberProject {
  project: Project;
  membership: ProjectMembership;
}

export interface CreateProjectInput {
  name: string;
  client: string;
  note: string | null;
  pictureUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  type: ProjectType;
}

export interface UpdateProjectStatusInput {
  projectId: string;
  status: ProjectStatus;
}
