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
  links: ProjectLink[];
}

export interface ProjectLink {
  label: string;
  url: string;
}

// a project as the projects page shows it: description, links and its members
export interface ProjectRecord {
  id: string;
  name: string;
  client: string;
  description: string;
  // the one responsible person; always also a member
  managerId: string | null;
  status: ProjectStatus;
  memberIds: string[];
  links: ProjectLink[];
  // changes on every save, so a stale edit is refused instead of overwriting newer data
  updatedAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
}

export type ProjectMembership = 'manager' | 'member';

export interface MemberProject {
  project: Project;
  membership: ProjectMembership;
}

export interface CreateProjectInput {
  name: string;
  client: string;
  description: string;
  managerId: string;
  // managers and admins added as members right away; their role gives them manager rights
  managerIds: string[];
}

export interface CreatedProject {
  id: string;
  name: string;
}

export interface UpdateProjectStatusInput {
  projectId: string;
  status: ProjectStatus;
}

export interface UpdateProjectInput {
  projectId: string;
  changes: Partial<Pick<ProjectRecord, 'name' | 'client' | 'description' | 'managerId' | 'status' | 'links'>>;
  baseUpdatedAt: string;
}

export type UpdateProjectResult = { status: 'saved'; project: Project } | { status: 'conflict' };

export interface ProjectMemberInput {
  projectId: string;
  userId: string;
}
