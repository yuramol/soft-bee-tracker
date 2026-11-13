import { describe, expect, it } from 'vitest';

import { buildReportCsv, buildReportFileName, buildReportPdf, formatDays, type ReportExportMeta } from '@/lib/report-export';
import type { Report } from '@/lib/reports';

describe('buildReportCsv', () => {
  it('records the active filters, time zone and generation time', () => {
    const csv = buildReportCsv(REPORT, META);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Period","9 Nov – 15 Nov (2026-11-09 – 2026-11-15)"');
    expect(csv).toContain('"Projects","Fundayo"');
    expect(csv).toContain('"People","My team"');
    expect(csv).toContain('"Vacation and sickness","Shown"');
    expect(csv).toContain('"Time zone","UTC+2"');
    expect(csv).toContain('"Generated at","11 Nov 2026, 14:05"');
  });

  it('writes the same rows and totals as the screen', () => {
    const lines = buildReportCsv(REPORT, META).trim().split('\r\n');

    expect(lines.slice(-4)).toEqual([
      '"Person","Project","Time","Absence days","Vacation days","Sick days"',
      '"Alex S.","Fundayo","8:00","","",""',
      '"Anastasia P.","Fundayo","8:00","1","1","0"',
      '"Total","","16:00","1","1","0"'
    ]);
  });

  it('leaves absence columns out when they are hidden', () => {
    const csv = buildReportCsv({ ...REPORT, filters: { ...REPORT.filters, showAbsence: false } }, META);

    expect(csv).toContain('"Person","Project","Time"\r\n');
    expect(csv).toContain('"Total","","16:00"\r\n');
    expect(csv).toContain('"Vacation and sickness","Hidden"');
  });

  it('neutralises spreadsheet formulas and quotes', () => {
    const report: Report = { ...REPORT, rows: [{ ...REPORT.rows[0], memberName: '=HYPERLINK("x")' }] };

    expect(buildReportCsv(report, META)).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('buildReportPdf', () => {
  it('produces a well-formed PDF with the report content', () => {
    const pdf = buildReportPdf(REPORT, META);

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trim().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('(Anastasia P.) Tj');
    expect(pdf).toContain('(16:00) Tj');
    expect(pdf).toContain('(Time zone: UTC+2) Tj');
  });

  it('points the xref table at each object', () => {
    const pdf = buildReportPdf(REPORT, META);
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));

    offsets.forEach((offset, index) => {
      expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true);
    });
  });

  it('splits long reports across pages', () => {
    const rows = Array.from({ length: 120 }, (_, index) => ({ ...REPORT.rows[0], id: `r${index}` }));
    const pdf = buildReportPdf({ ...REPORT, rows }, META);

    expect(Number(/\/Count (\d+)/.exec(pdf)?.[1])).toBeGreaterThan(1);
  });

  it('escapes PDF syntax and falls back for characters Helvetica lacks', () => {
    const report: Report = { ...REPORT, rows: [{ ...REPORT.rows[0], memberName: 'Олена (QA) Ševčík' }] };

    expect(buildReportPdf(report, META)).toContain('(????? \\(QA\\) Sevcik) Tj');
  });
});

describe('formatting helpers', () => {
  it('pluralises days', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(3)).toBe('3 days');
  });

  it('names files after the period', () => {
    expect(buildReportFileName(REPORT, 'csv')).toBe('soft-bee-report-2026-11-09-2026-11-15.csv');
  });
});

const REPORT: Report = {
  filters: { from: '2026-11-09', to: '2026-11-15', projectIds: ['p1'], memberIds: [], showAbsence: true },
  rows: [
    { id: 'u3:p1', memberId: 'u3', memberName: 'Alex S.', projectId: 'p1', projectName: 'Fundayo', minutes: 480, absence: null },
    {
      id: 'u4:p1',
      memberId: 'u4',
      memberName: 'Anastasia P.',
      projectId: 'p1',
      projectName: 'Fundayo',
      minutes: 480,
      absence: { days: 1, vacationDays: 1, sickDays: 0 }
    }
  ],
  totals: { minutes: 960, absence: { days: 1, vacationDays: 1, sickDays: 0 } }
};

const META: ReportExportMeta = {
  generatedAt: new Date('2026-11-11T12:05:00Z'),
  timeZone: 'Etc/GMT-2',
  timeZoneLabel: 'UTC+2',
  projectsLabel: 'Fundayo',
  peopleLabel: 'My team'
};
