import { ROUTES } from '@/constants';

export function buildTeamReportHref({ period, memberIds }: TeamReportParams): string {
  const params = new URLSearchParams({ period });

  if (memberIds.length > 0) {
    params.set(MEMBERS_PARAM, memberIds.join(','));
  }

  return `${ROUTES.REPORTS}?${params.toString()}`;
}

export function parseTeamReportParams(searchParams: Record<string, string | string[] | undefined>): ParsedTeamReportParams {
  const period = firstValue(searchParams.period);
  const members = firstValue(searchParams[MEMBERS_PARAM]);

  return {
    period: isReportPeriod(period) ? period : null,
    memberIds: members ? members.split(',').filter(Boolean) : null
  };
}

export function isReportPeriod(value: string | undefined): value is ReportPeriod {
  return value !== undefined && (REPORT_PERIODS as string[]).includes(value);
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const MEMBERS_PARAM = 'members';

export const REPORT_PERIODS: ReportPeriod[] = ['this-week', 'this-month', 'last-month'];

export type ReportPeriod = 'this-week' | 'this-month' | 'last-month';

export interface TeamReportParams {
  period: ReportPeriod;
  memberIds: string[];
}

export interface ParsedTeamReportParams {
  period: ReportPeriod | null;
  memberIds: string[] | null;
}
