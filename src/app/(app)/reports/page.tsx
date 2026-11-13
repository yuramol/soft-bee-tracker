import { Suspense } from 'react';

import { PageHeader } from '@components/common/page-header/page-header';
import { ReportResultsSkeleton } from '@components/reports/reports-skeleton';
import { ReportsWorkspace } from '@components/reports/reports-workspace/reports-workspace';
import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';
import { getReportSource } from '@/lib/api/reports/server';
import { buildReport, getReportOptions, getTodayKey, parseReportFilters, type ReportSearchParams } from '@/lib/reports';
import { COMPANY_TIME_ZONE } from '@/lib/work-time-policy';
import content from './content.json';

// The report is built on the server and scoped to the viewer (RLS plus getReportScope) before anything reaches the browser
export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const profile = await requireRouteAccess(ROUTES.REPORTS);

  // the general report always uses the company time zone, not the viewer's own
  const todayKey = getTodayKey(COMPANY_TIME_ZONE, new Date());
  const filters = parseReportFilters(await searchParams, todayKey);
  const viewer = { id: profile.id, role: profile.role };
  const data = await getReportSource(filters);
  const report = buildReport(data, filters, viewer);

  return (
    <>
      <PageHeader title={content.title} />
      <Suspense fallback={<ReportResultsSkeleton />}>
        <ReportsWorkspace report={report} options={getReportOptions(viewer, data)} role={profile.role} todayKey={todayKey} />
      </Suspense>
    </>
  );
}

interface ReportsPageProps {
  searchParams: Promise<ReportSearchParams>;
}
