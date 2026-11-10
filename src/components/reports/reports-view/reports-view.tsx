'use client';

import { ChartColumnIcon, CheckCheckIcon, ClockIcon, FileDownIcon, FolderKanbanIcon, UsersIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@components/common/data-table/data-table';
import { EmptyState } from '@components/common/empty-state/empty-state';
import { StatCard } from '@components/common/stat-card/stat-card';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Progress } from '@ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';
import { formatDuration, toPercent } from '@/lib/format-duration';
import { MOCK_REPORT_PROJECTS, MOCK_REPORT_ROWS, type ReportRow } from '@/mocks/reports.mock';
import { formatText } from '@/lib/format-text';
import type { ReportPeriod } from '@/lib/team-report-params';
import content from './content.json';

export function ReportsView({ initialPeriod, memberIds }: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod ?? 'this-month');
  const [project, setProject] = useState<string>(ALL_PROJECTS);
  const [crewMemberIds, setCrewMemberIds] = useState<string[] | null>(memberIds);
  const rows = MOCK_REPORT_ROWS.filter(
    (row) => (project === ALL_PROJECTS || row.projectName === project) && (!crewMemberIds || crewMemberIds.includes(row.memberId))
  );
  const totals = summarize(rows);

  function handleClearCrewFilter() {
    setCrewMemberIds(null);
  }

  function handlePeriodChange(value: ReportPeriod | null) {
    setPeriod(value ?? 'this-month');
  }

  function handleProjectChange(value: string | null) {
    setProject(value ?? ALL_PROJECTS);
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-card flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center'>
        <Select<ReportPeriod> value={period} onValueChange={handlePeriodChange} items={PERIOD_OPTIONS}>
          <SelectTrigger className='w-full sm:w-44' aria-label={content.filters.periodLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select<string> value={project} onValueChange={handleProjectChange} items={PROJECT_OPTIONS}>
          <SelectTrigger className='w-full sm:w-48' aria-label={content.filters.projectLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {crewMemberIds ? (
          <Badge variant='secondary' className='h-9 gap-1 rounded-full pr-1 pl-3 text-sm'>
            {formatText(content.filters.crewScope, { count: crewMemberIds.length })}
            <Button variant='ghost' size='icon-xs' aria-label={content.filters.clearCrewScope} onClick={handleClearCrewFilter}>
              <XIcon />
            </Button>
          </Badge>
        ) : null}
        <div className='flex gap-2 sm:ml-auto'>
          <ExportButton label={content.export.csv} />
          <ExportButton label={content.export.pdf} />
        </div>
      </div>

      <section aria-label={content.totals.label} className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          isHighlighted
          label={content.totals.logged}
          icon={ClockIcon}
          value={formatDuration(totals.minutes)}
          hint={content.totals.loggedHint}
        />
        <StatCard
          label={content.totals.approved}
          icon={CheckCheckIcon}
          value={formatText(content.percent, { value: toPercent(totals.approvedMinutes, totals.minutes) })}
          hint={formatDuration(totals.approvedMinutes)}
        />
        <StatCard label={content.totals.people} icon={UsersIcon} value={String(totals.people)} hint={content.totals.withLoggedTime} />
        <StatCard
          label={content.totals.projects}
          icon={FolderKanbanIcon}
          value={String(totals.projects)}
          hint={content.totals.withLoggedTime}
        />
      </section>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
        <ProjectBreakdown rows={rows} totalMinutes={totals.minutes} />
        <DataTable
          columns={COLUMNS}
          rows={rows}
          getRowId={getRowId}
          renderMobileRow={renderMobileRow}
          emptyState={<EmptyState icon={ChartColumnIcon} title={content.emptyTitle} description={content.emptyDescription} />}
        />
      </div>
    </div>
  );
}

function ProjectBreakdown({ rows, totalMinutes }: { rows: ReportRow[]; totalMinutes: number }) {
  const byProject = groupMinutesByProject(rows);

  return (
    <section aria-labelledby='project-breakdown' className='bg-card flex flex-col gap-5 rounded-2xl border p-5'>
      <h2 id='project-breakdown' className='text-base font-semibold'>
        {content.byProject.title}
      </h2>
      <ul className='flex flex-col gap-4'>
        {byProject.map((item) => (
          <li key={item.projectName} className='flex flex-col gap-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='font-medium'>{item.projectName}</span>
              <span className='text-muted-foreground tabular-nums'>{formatDuration(item.minutes)}</span>
            </div>
            <Progress
              value={toPercent(item.minutes, totalMinutes)}
              aria-label={formatText(content.byProject.shareLabel, { name: item.projectName })}
              className='[&_[data-slot=progress-indicator]]:bg-deep-teal dark:[&_[data-slot=progress-indicator]]:bg-electric-green [&_[data-slot=progress-track]]:h-2'
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExportButton({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />}>
        <Button variant='outline' disabled>
          <FileDownIcon data-icon='inline-start' />
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{content.export.comingSoon}</TooltipContent>
    </Tooltip>
  );
}

function renderMobileRow(row: ReportRow) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex min-w-0 flex-col'>
        <span className='truncate font-medium'>{row.memberName}</span>
        <span className='text-muted-foreground truncate text-xs'>{row.projectName}</span>
      </div>
      <div className='flex flex-col items-end'>
        <span className='font-semibold tabular-nums'>{formatDuration(row.minutes)}</span>
        <span className='text-muted-foreground text-xs'>
          {formatText(content.approvedShare, { percent: toPercent(row.approvedMinutes, row.minutes) })}
        </span>
      </div>
    </div>
  );
}

function getRowId(row: ReportRow): string {
  return row.id;
}

function summarize(rows: ReportRow[]): ReportTotals {
  return {
    minutes: rows.reduce((sum, row) => sum + row.minutes, 0),
    approvedMinutes: rows.reduce((sum, row) => sum + row.approvedMinutes, 0),
    people: new Set(rows.map((row) => row.memberName)).size,
    projects: new Set(rows.map((row) => row.projectName)).size
  };
}

function groupMinutesByProject(rows: ReportRow[]): Array<{ projectName: string; minutes: number }> {
  const totals = new Map<string, number>();

  rows.forEach((row) => totals.set(row.projectName, (totals.get(row.projectName) ?? 0) + row.minutes));

  return [...totals.entries()].map(([projectName, minutes]) => ({ projectName, minutes })).sort((a, b) => b.minutes - a.minutes);
}

const ALL_PROJECTS = 'all';

const PERIOD_OPTIONS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'this-week', label: content.filters.periods.thisWeek },
  { value: 'this-month', label: content.filters.periods.thisMonth },
  { value: 'last-month', label: content.filters.periods.lastMonth }
];

const PROJECT_OPTIONS = [
  { value: ALL_PROJECTS, label: content.filters.allProjects },
  ...MOCK_REPORT_PROJECTS.map((name) => ({ value: name, label: name }))
];

const COLUMNS: DataTableColumn<ReportRow>[] = [
  { id: 'member', header: content.columns.member, cell: (row) => <span className='font-medium'>{row.memberName}</span> },
  { id: 'project', header: content.columns.project, cell: (row) => <span className='text-muted-foreground'>{row.projectName}</span> },
  {
    id: 'logged',
    header: content.columns.logged,
    className: 'text-right',
    cell: (row) => <span className='font-medium tabular-nums'>{formatDuration(row.minutes)}</span>
  },
  {
    id: 'approved',
    header: content.columns.approved,
    className: 'text-right',
    cell: (row) => <span className='text-muted-foreground tabular-nums'>{toPercent(row.approvedMinutes, row.minutes)}%</span>
  }
];

interface ReportsViewProps {
  initialPeriod: ReportPeriod | null;
  memberIds: string[] | null;
}

interface ReportTotals {
  minutes: number;
  approvedMinutes: number;
  people: number;
  projects: number;
}
