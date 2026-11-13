import { formatClock } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { formatPeriodShort, type Report, type ReportRow } from '@/lib/reports';
import content from './report-export.content.json';

export function formatDays(days: number): string {
  return formatText(days === 1 ? content.days.one : content.days.other, { count: days });
}

export function formatGeneratedAt(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

export function buildReportFileName(report: Report, extension: ReportExportFormat): string {
  return formatText(content.fileName, { from: report.filters.from, to: report.filters.to, extension });
}

export function buildReportCsv(report: Report, meta: ReportExportMeta): string {
  const { showAbsence } = report.filters;
  const header = [content.columns.person, content.columns.project, content.columns.time];
  const absenceHeader = [content.columns.absenceDays, content.columns.vacationDays, content.columns.sickDays];
  const rows = report.rows.map((row) => [
    row.memberName,
    row.projectName ?? '',
    formatClock(row.minutes),
    ...(showAbsence ? toAbsenceCells(row) : [])
  ]);
  const { absence } = report.totals;
  const totalRow = [
    content.total,
    '',
    formatClock(report.totals.minutes),
    ...(showAbsence ? [String(absence.days), String(absence.vacationDays), String(absence.sickDays)] : [])
  ];

  const lines = [[content.title], ...getMetaLines(report, meta), [], [...header, ...(showAbsence ? absenceHeader : [])], ...rows, totalRow];

  // BOM so spreadsheet apps open the file as UTF-8
  return `﻿${lines.map((cells) => cells.map(toCsvCell).join(',')).join('\r\n')}\r\n`;
}

export function buildReportPdf(report: Report, meta: ReportExportMeta): string {
  const { showAbsence } = report.filters;
  const columns = showAbsence ? PDF_COLUMNS : PDF_COLUMNS.slice(0, 3);
  const header = columns.map((column) => column.label);
  const pages: PdfText[][] = [];
  let page: PdfText[] = [];
  let y = PDF_PAGE.height - PDF_PAGE.margin;

  function ensureSpace(height: number) {
    if (y - height >= PDF_PAGE.margin) {
      return;
    }

    pages.push(page);
    page = [];
    y = PDF_PAGE.height - PDF_PAGE.margin;
    writeRow(header, true);
  }

  function writeRow(cells: string[], isBold: boolean) {
    y -= PDF_ROW_HEIGHT;
    columns.forEach((column, index) => {
      page.push({ text: truncate(cells[index] ?? '', column.maxChars), x: column.x, y, size: 10, isBold });
    });
  }

  y -= 16;
  page.push({ text: content.title, x: PDF_PAGE.margin, y, size: 16, isBold: true });
  y -= 6;

  for (const [label, value] of getMetaLines(report, meta)) {
    y -= 13;
    page.push({ text: `${label}: ${value}`, x: PDF_PAGE.margin, y, size: 9, isBold: false });
  }

  y -= 10;
  writeRow(header, true);

  if (report.rows.length === 0) {
    y -= PDF_ROW_HEIGHT;
    page.push({ text: content.empty, x: PDF_PAGE.margin, y, size: 10, isBold: false });
  }

  for (const row of report.rows) {
    ensureSpace(PDF_ROW_HEIGHT);
    writeRow(
      [
        row.memberName,
        row.projectName ?? content.noProject,
        row.minutes > 0 ? formatClock(row.minutes) : content.noProject,
        row.absence ? formatDays(row.absence.days) : ''
      ],
      false
    );
  }

  ensureSpace(PDF_ROW_HEIGHT + 4);
  y -= 4;
  writeRow([content.total, '', formatClock(report.totals.minutes), formatDays(report.totals.absence.days)], true);
  pages.push(page);

  return renderPdf(pages);
}

function getMetaLines(report: Report, meta: ReportExportMeta): string[][] {
  return [
    [content.meta.period, `${formatPeriodShort(report.filters)} (${report.filters.from} – ${report.filters.to})`],
    [content.meta.projects, meta.projectsLabel],
    [content.meta.people, meta.peopleLabel],
    [content.meta.absence, report.filters.showAbsence ? content.meta.shown : content.meta.hidden],
    [content.meta.timeZone, meta.timeZoneLabel],
    [content.meta.generatedAt, formatGeneratedAt(meta.generatedAt, meta.timeZone)]
  ];
}

function toAbsenceCells(row: ReportRow): string[] {
  return row.absence ? [String(row.absence.days), String(row.absence.vacationDays), String(row.absence.sickDays)] : ['', '', ''];
}

// Quotes every cell and neutralises leading formula characters, since names come from user input
function toCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-?\d/.test(value) ? `'${value}` : value;

  return `"${safe.replace(/"/g, '""')}"`;
}

function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
}

// Minimal single-font PDF writer: text only, standard Helvetica, so it needs no dependency
function renderPdf(pages: PdfText[][]): string {
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 5 + index * 2);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  pages.forEach((texts, index) => {
    const stream = texts
      .map((text) => `BT /${text.isBold ? 'F2' : 'F1'} ${text.size} Tf ${text.x} ${text.y.toFixed(1)} Td (${toPdfString(text.text)}) Tj ET`)
      .join('\n');

    objects[pageIds[index]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE.width} ${PDF_PAGE.height}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`;
    objects[pageIds[index] + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let output = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = output.length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = output.length;
  const xrefEntries = offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`);

  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n${xrefEntries.join('')}`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return output;
}

// Helvetica covers Latin only, so accents are stripped and other scripts fall back to "?"
function toPdfString(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/[\\()]/g, (char) => `\\${char}`);
}

const PDF_PAGE = { width: 595, height: 842, margin: 48 };

const PDF_ROW_HEIGHT = 16;

const PDF_COLUMNS = [
  { label: content.columns.person, x: 48, maxChars: 26 },
  { label: content.columns.project, x: 210, maxChars: 30 },
  { label: content.columns.time, x: 390, maxChars: 10 },
  { label: content.columns.absenceDays, x: 460, maxChars: 14 }
];

export type ReportExportFormat = 'csv' | 'pdf';

export interface ReportExportMeta {
  generatedAt: Date;
  timeZone: string;
  timeZoneLabel: string;
  projectsLabel: string;
  peopleLabel: string;
}

interface PdfText {
  text: string;
  x: number;
  y: number;
  size: number;
  isBold: boolean;
}
