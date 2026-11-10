import type { UserRole } from '@/lib/api/auth';
import type { LeaveAllowance, LeaveStatus, LeaveType } from '@/mocks/leave.mock';

// Layout-only mock until crew gets its own backend task
export const MOCK_CREW: CrewMember[] = [
  {
    id: 'u1',
    firstName: 'Olena',
    lastName: 'Koval',
    email: 'olena@softbee.dev',
    role: 'admin',
    position: 'Delivery lead',
    status: 'active',
    phone: '+380671112233',
    linkedin: 'https://www.linkedin.com/in/olena-koval',
    upwork: null,
    employmentDate: '2021-03-01',
    managerId: null,
    projects: ['Internal'],
    weekMinutesByProject: { Internal: 900 },
    monthMinutes: 3720
  },
  {
    id: 'u2',
    firstName: 'Andrii',
    lastName: 'Melnyk',
    email: 'andrii@softbee.dev',
    role: 'manager',
    position: 'Project manager',
    status: 'active',
    phone: '+380502223344',
    linkedin: 'https://www.linkedin.com/in/andrii-melnyk',
    upwork: 'https://www.upwork.com/freelancers/andriimelnyk',
    employmentDate: '2022-06-15',
    managerId: 'u1',
    projects: ['Nova Mobile'],
    weekMinutesByProject: { 'Nova Mobile': 660 },
    monthMinutes: 2880
  },
  {
    id: 'u3',
    firstName: 'Iryna',
    lastName: 'Shevchenko',
    email: 'iryna@softbee.dev',
    role: 'worker',
    position: 'Frontend engineer',
    status: 'active',
    phone: '+380633334455',
    linkedin: 'https://www.linkedin.com/in/iryna-shevchenko',
    upwork: null,
    employmentDate: '2023-02-01',
    managerId: 'u2',
    projects: ['Atlas CRM', 'Internal'],
    weekMinutesByProject: { 'Atlas CRM': 960, Internal: 240 },
    monthMinutes: 4560
  },
  {
    id: 'u4',
    firstName: 'Taras',
    lastName: 'Bondar',
    email: 'taras@softbee.dev',
    role: 'worker',
    position: 'Backend engineer',
    status: 'active',
    phone: null,
    linkedin: null,
    upwork: 'https://www.upwork.com/freelancers/tarasbondar',
    employmentDate: '2023-09-11',
    managerId: 'u2',
    projects: ['Atlas CRM', 'Helios API'],
    weekMinutesByProject: { 'Atlas CRM': 720, 'Helios API': 480 },
    monthMinutes: 4320
  },
  {
    id: 'u5',
    firstName: 'Sofiia',
    lastName: 'Tkachenko',
    email: 'sofiia@softbee.dev',
    role: 'worker',
    position: 'QA engineer',
    status: 'blocked',
    phone: '+380974445566',
    linkedin: null,
    upwork: null,
    employmentDate: '2024-01-08',
    managerId: 'u2',
    projects: [],
    weekMinutesByProject: {},
    monthMinutes: 0
  },
  {
    id: 'u6',
    firstName: 'Maksym',
    lastName: 'Kravets',
    email: 'maksym@softbee.dev',
    role: 'worker',
    position: 'Designer',
    status: 'active',
    phone: '+380935556677',
    linkedin: 'https://www.linkedin.com/in/maksym-kravets',
    upwork: null,
    employmentDate: '2025-11-01',
    managerId: 'u2',
    projects: ['Nova Mobile'],
    weekMinutesByProject: { 'Nova Mobile': 840 },
    monthMinutes: 3360
  },
  {
    id: 'u7',
    firstName: 'Daryna',
    lastName: 'Lysenko',
    email: 'daryna@softbee.dev',
    role: 'worker',
    position: 'Frontend engineer',
    status: 'pending',
    phone: null,
    linkedin: null,
    upwork: null,
    employmentDate: null,
    managerId: 'u2',
    projects: [],
    weekMinutesByProject: {},
    monthMinutes: 0
  }
];

export const MOCK_CREW_LEAVE_REQUESTS: CrewLeaveRequest[] = [
  { id: 'cl1', memberId: 'u3', leaveType: 'vacation', startDate: '2026-11-23', endDate: '2026-11-27', status: 'pending' },
  { id: 'cl2', memberId: 'u6', leaveType: 'sick_leave', startDate: '2026-11-12', endDate: '2026-11-12', status: 'pending' },
  { id: 'cl3', memberId: 'u4', leaveType: 'vacation', startDate: '2026-12-21', endDate: '2026-12-31', status: 'approved' },
  { id: 'cl4', memberId: 'u2', leaveType: 'vacation', startDate: '2026-12-01', endDate: '2026-12-03', status: 'pending' }
];

export const MOCK_CREW_LEAVE_ALLOWANCES: LeaveAllowance[] = [
  { id: 'crew-allowance-vacation', year: new Date().getFullYear(), leaveType: 'vacation', days: 25 },
  { id: 'crew-allowance-sick', year: new Date().getFullYear(), leaveType: 'sick_leave', days: 5 }
];

// Real managers have no team in the mock, so they see the mock manager's team
export function getMockViewerId(viewer: CrewViewer): string {
  return viewer.role === 'manager' ? MOCK_MANAGER_ID : viewer.id;
}

const MOCK_MANAGER_ID = 'u2';

export type CrewStatus = 'pending' | 'active' | 'blocked';

export interface CrewMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  position: string;
  status: CrewStatus;
  phone: string | null;
  linkedin: string | null;
  upwork: string | null;
  employmentDate: string | null;
  managerId: string | null;
  projects: string[];
  weekMinutesByProject: Record<string, number>;
  monthMinutes: number;
}

export interface CrewLeaveRequest {
  id: string;
  memberId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
}

export interface CrewViewer {
  id: string;
  role: UserRole;
}
