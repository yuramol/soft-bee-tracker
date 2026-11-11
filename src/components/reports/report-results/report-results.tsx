import { ChartColumnIcon, RotateCcwIcon } from 'lucide-react';

import { EmptyState } from '@components/common/empty-state/empty-state';
import { Button } from '@ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@ui/table';
import { formatClock } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { formatDays } from '@/lib/report-export';
import { COMPANY_TIME_ZONE_LABEL } from '@/lib/work-time-policy';
import { formatPeriodHeading, type Report, type ReportAbsenceSummary, type ReportRow } from '@/lib/reports';
import content from '../content.json';

export function ReportResults({ report, canReset, onReset }: ReportResultsProps) {
  const { filters, rows, totals } = report;
  const period = formatPeriodHeading(filters);

  return (
    <section aria-label={content.results.label} className='flex min-w-0 flex-col gap-5'>
      <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1'>
        <div className='flex flex-col gap-0.5'>
          <h2 className='text-xl font-semibold tracking-tight'>{period}</h2>
          <p className='text-muted-foreground text-xs'>{formatText(content.results.timeZoneNote, { zone: COMPANY_TIME_ZONE_LABEL })}</p>
        </div>
        <p className='text-lg font-semibold tabular-nums'>
          {formatText(content.results.totalTracked, { time: formatClock(totals.minutes) })}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title={content.empty.title}
          description={formatText(filters.showAbsence ? content.empty.description : content.empty.descriptionNoAbsence, { period })}
          action={
            canReset ? (
              <Button variant='outline' onClick={onReset}>
                <RotateCcwIcon data-icon='inline-start' />
                {content.empty.reset}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <ReportTable report={report} />
          <ReportList report={report} />
        </>
      )}
    </section>
  );
}

function ReportTable({ report }: { report: Report }) {
  const { showAbsence } = report.filters;

  return (
    <div className='bg-card hidden overflow-hidden rounded-2xl border md:block'>
      <Table>
        <TableHeader className='bg-muted/50'>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='h-11 px-4'>{content.results.columns.person}</TableHead>
            <TableHead className='h-11 px-4'>{content.results.columns.project}</TableHead>
            <TableHead className='h-11 px-4 text-right'>{content.results.columns.time}</TableHead>
            {showAbsence ? <TableHead className='h-11 px-4'>{content.results.columns.absence}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className='px-4 py-3 font-medium'>{row.memberName}</TableCell>
              <TableCell className='text-muted-foreground px-4 py-3'>{getProjectLabel(row)}</TableCell>
              <TableCell className='px-4 py-3 text-right tabular-nums'>{getTimeLabel(row)}</TableCell>
              {showAbsence ? (
                <TableCell className='px-4 py-3'>
                  {isSamePersonAsPrevious(report.rows, index) ? null : <AbsenceValue absence={row.absence} />}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className='bg-transparent'>
          <TableRow className='hover:bg-transparent'>
            <TableCell className='px-4 py-4 font-semibold' colSpan={2}>
              {content.results.total}
            </TableCell>
            <TableCell className='px-4 py-4 text-right font-semibold tabular-nums'>{formatClock(report.totals.minutes)}</TableCell>
            {showAbsence ? <TableCell className='px-4 py-4 font-semibold'>{formatDays(report.totals.absence.days)}</TableCell> : null}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function ReportList({ report }: { report: Report }) {
  const { showAbsence } = report.filters;

  return (
    <div className='flex flex-col gap-3 md:hidden'>
      <ul className='flex flex-col gap-3'>
        {report.rows.map((row) => (
          <li key={row.id} className='bg-card flex items-start justify-between gap-3 rounded-2xl border p-4'>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <span className='truncate font-medium'>{row.memberName}</span>
              <span className='text-muted-foreground truncate text-sm'>{getProjectLabel(row)}</span>
            </div>
            <div className='flex shrink-0 flex-col items-end gap-0.5 text-right'>
              <span className='font-semibold tabular-nums'>{getTimeLabel(row)}</span>
              {showAbsence && row.absence ? <AbsenceValue absence={row.absence} /> : null}
            </div>
          </li>
        ))}
      </ul>
      <div className='bg-muted/50 flex items-center justify-between gap-3 rounded-2xl border p-4 font-semibold'>
        <span>{content.results.total}</span>
        <span className='flex flex-col items-end text-right tabular-nums'>
          {formatClock(report.totals.minutes)}
          {showAbsence ? <span className='text-sm'>{formatDays(report.totals.absence.days)}</span> : null}
        </span>
      </div>
    </div>
  );
}

function AbsenceValue({ absence }: { absence: ReportAbsenceSummary | null }) {
  if (!absence) {
    return <span className='text-muted-foreground'>{content.results.none}</span>;
  }

  return (
    <span className='flex flex-col'>
      <span className='tabular-nums'>{formatDays(absence.days)}</span>
      <span className='text-muted-foreground text-xs'>{getAbsenceBreakdown(absence)}</span>
    </span>
  );
}

function getAbsenceBreakdown({ vacationDays, sickDays }: ReportAbsenceSummary): string {
  if (vacationDays > 0 && sickDays > 0) {
    return formatText(content.results.absenceBreakdown.mixed, { vacation: vacationDays, sick: sickDays });
  }

  return vacationDays > 0 ? content.results.absenceBreakdown.vacation : content.results.absenceBreakdown.sick;
}

// a person's absence is shown once, on their first row
function isSamePersonAsPrevious(rows: ReportRow[], index: number): boolean {
  return index > 0 && rows[index - 1].memberId === rows[index].memberId;
}

function getProjectLabel(row: ReportRow): string {
  return row.projectName ?? content.results.absenceOnly;
}

function getTimeLabel(row: ReportRow): string {
  return row.projectId ? formatClock(row.minutes) : content.results.none;
}

interface ReportResultsProps {
  report: Report;
  canReset: boolean;
  onReset: () => void;
}
