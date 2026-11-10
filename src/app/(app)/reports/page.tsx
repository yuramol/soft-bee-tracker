import { PageHeader } from '@components/common/page-header/page-header';
import { ReportsView } from '@components/reports/reports-view/reports-view';
import { parseTeamReportParams } from '@/lib/team-report-params';
import content from './content.json';

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { period, memberIds } = parseTeamReportParams(await searchParams);

  return (
    <>
      <PageHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <ReportsView initialPeriod={period} memberIds={memberIds} />
    </>
  );
}

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
