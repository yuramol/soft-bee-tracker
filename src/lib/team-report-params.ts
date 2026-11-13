import { ROUTES } from '@/constants';

export function buildTeamReportHref({ period, memberIds = [], projectIds = [] }: TeamReportParams): string {
  const params = new URLSearchParams({ period });

  if (projectIds.length > 0) {
    params.set(PROJECTS_PARAM, projectIds.join(','));
  }

  if (memberIds.length > 0) {
    params.set(MEMBERS_PARAM, memberIds.join(','));
  }

  return `${ROUTES.REPORTS}?${params.toString()}`;
}

export function isReportPeriod(value: string | undefined): value is ReportPeriod {
  return value !== undefined && (REPORT_PERIODS as string[]).includes(value);
}

const MEMBERS_PARAM = 'members';

const PROJECTS_PARAM = 'projects';

export const REPORT_PERIODS: ReportPeriod[] = ['this-week', 'last-week', 'this-month', 'last-month'];

export type ReportPeriod = 'this-week' | 'last-week' | 'this-month' | 'last-month';

export interface TeamReportParams {
  period: ReportPeriod;
  memberIds?: string[];
  projectIds?: string[];
}
