export interface ProjectRate {
  projectId: string;
  userId: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateProjectRateInput = Pick<ProjectRate, 'projectId' | 'userId' | 'rate'>;
