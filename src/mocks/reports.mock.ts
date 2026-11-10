export const MOCK_REPORT_ROWS: ReportRow[] = [
  { id: 'r1', memberId: 'u3', memberName: 'Iryna Shevchenko', projectName: 'Atlas CRM', minutes: 4320, approvedMinutes: 4020 },
  { id: 'r2', memberId: 'u4', memberName: 'Taras Bondar', projectName: 'Atlas CRM', minutes: 3900, approvedMinutes: 3900 },
  { id: 'r3', memberId: 'u6', memberName: 'Maksym Kravets', projectName: 'Nova Mobile', minutes: 3120, approvedMinutes: 2760 },
  { id: 'r4', memberId: 'u2', memberName: 'Andrii Melnyk', projectName: 'Nova Mobile', minutes: 2640, approvedMinutes: 2640 },
  { id: 'r5', memberId: 'u3', memberName: 'Iryna Shevchenko', projectName: 'Internal', minutes: 1920, approvedMinutes: 1500 },
  { id: 'r6', memberId: 'u4', memberName: 'Taras Bondar', projectName: 'Helios API', minutes: 1980, approvedMinutes: 1980 }
];

export const MOCK_REPORT_PROJECTS = ['Atlas CRM', 'Nova Mobile', 'Helios API', 'Internal'];

export interface ReportRow {
  id: string;
  memberId: string;
  memberName: string;
  projectName: string;
  minutes: number;
  approvedMinutes: number;
}
