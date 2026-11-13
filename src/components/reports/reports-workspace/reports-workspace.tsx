'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { ReportFilters } from '@components/reports/report-filters/report-filters';
import { ReportResults } from '@components/reports/report-results/report-results';
import { ReportResultsSkeleton } from '@components/reports/reports-skeleton';
import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth';
import { downloadFile } from '@/lib/download-file';
import { COMPANY_TIME_ZONE, COMPANY_TIME_ZONE_LABEL } from '@/lib/work-time-policy';
import { formatText } from '@/lib/format-text';
import { buildReportCsv, buildReportFileName, buildReportPdf, type ReportExportFormat } from '@/lib/report-export';
import {
  buildReportSearch,
  describeSelection,
  getDefaultFilters,
  isSameFilters,
  type Report,
  type ReportFilters as ReportFiltersValue,
  type ReportOptions
} from '@/lib/reports';
import content from '../content.json';

export function ReportsWorkspace({ report, options, role, todayKey }: ReportsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const labels = getSelectionLabels(role);
  const defaults = getDefaultFilters(todayKey);
  const isDefaultReport = isSameFilters(report.filters, defaults);

  function navigate(filters: ReportFiltersValue) {
    if (isSameFilters(filters, report.filters)) {
      return;
    }

    startTransition(() => {
      router.push(`${ROUTES.REPORTS}${buildReportSearch(filters)}`);
    });
  }

  function handleReset() {
    navigate(defaults);
  }

  // Exports use the applied report, the same object the table renders, so screen and files match.
  // A failure only shows a toast: the filters live in the URL and stay as they were.
  function handleExport(format: ReportExportFormat) {
    const formatLabel = format.toUpperCase();

    try {
      const meta = {
        generatedAt: new Date(),
        timeZone: COMPANY_TIME_ZONE,
        timeZoneLabel: COMPANY_TIME_ZONE_LABEL,
        projectsLabel: describeSelection(report.filters.projectIds, options.projects, labels.allProjects),
        peopleLabel: describeSelection(report.filters.memberIds, options.people, labels.allPeople)
      };
      const body = format === 'csv' ? buildReportCsv(report, meta) : buildReportPdf(report, meta);

      downloadFile(body, buildReportFileName(report, format), EXPORT_MIME_TYPES[format]);
      toast.success(formatText(content.export.done, { format: formatLabel }));
    } catch {
      toast.error(formatText(content.export.failed, { format: formatLabel }));
    }
  }

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12'>
      <div aria-busy={isPending} aria-live='polite'>
        {/* while new filters load, the previous totals are hidden so they are never read as the new ones */}
        {isPending ? (
          <div role='status'>
            <span className='sr-only'>{content.results.updating}</span>
            <ReportResultsSkeleton />
          </div>
        ) : (
          <ReportResults report={report} canReset={!isDefaultReport} onReset={handleReset} />
        )}
      </div>

      <aside className='order-first lg:order-none'>
        <ReportFilters
          key={buildReportSearch(report.filters)}
          applied={report.filters}
          options={options}
          labels={labels}
          todayKey={todayKey}
          isPending={isPending}
          onApply={navigate}
          onReset={handleReset}
          onExport={handleExport}
        />
      </aside>
    </div>
  );
}

function getSelectionLabels(role: UserRole): SelectionLabels {
  return SELECTION_LABELS[role];
}

const SELECTION_LABELS: Record<UserRole, SelectionLabels> = {
  admin: { allProjects: content.filters.allProjects, allPeople: content.filters.everyone },
  manager: { allProjects: content.filters.allAssignedProjects, allPeople: content.filters.myTeam },
  worker: { allProjects: content.filters.allAssignedProjects, allPeople: content.filters.onlyMe }
};

const EXPORT_MIME_TYPES: Record<ReportExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  pdf: 'application/pdf'
};

interface SelectionLabels {
  allProjects: string;
  allPeople: string;
}

interface ReportsWorkspaceProps {
  report: Report;
  options: ReportOptions;
  role: UserRole;
  todayKey: string;
}
