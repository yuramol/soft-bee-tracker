import { Suspense } from 'react';

import { PageHeader } from '@components/common/page-header/page-header';
import { ReportResultsSkeleton } from '@components/reports/reports-skeleton';
import { ReportsWorkspace } from '@components/reports/reports-workspace/reports-workspace';
import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';
import { buildReport, getReportOptions, getTodayKey, parseReportFilters, type ReportData, type ReportSearchParams } from '@/lib/reports';
import { COMPANY_TIME_ZONE } from '@/lib/work-time-policy';
import { MOCK_CREW } from '@/mocks/crew.mock';
import { getMockProjectViewer, MOCK_PROJECTS } from '@/mocks/projects.mock';
import { MOCK_REPORT_ABSENCES, MOCK_REPORT_ENTRIES } from '@/mocks/reports.mock';
import content from './content.json';

// The report is built on the server and scoped to the viewer before anything reaches the browser
export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const profile = await requireRouteAccess(ROUTES.REPORTS);

  // the general report always uses the company time zone, not the viewer's own
  const todayKey = getTodayKey(COMPANY_TIME_ZONE, new Date());
  const viewer = getMockProjectViewer(profile.role);
  const report = buildReport(REPORT_DATA, parseReportFilters(await searchParams, todayKey), viewer);

  return (
    <>
      <PageHeader title={content.title} />
      <Suspense fallback={<ReportResultsSkeleton />}>
        <ReportsWorkspace report={report} options={getReportOptions(viewer, REPORT_DATA)} role={profile.role} todayKey={todayKey} />
      </Suspense>
    </>
  );
}

const REPORT_DATA: ReportData = {
  entries: MOCK_REPORT_ENTRIES,
  absences: MOCK_REPORT_ABSENCES,
  crew: MOCK_CREW,
  projects: MOCK_PROJECTS
};

interface ReportsPageProps {
  searchParams: Promise<ReportSearchParams>;
}
