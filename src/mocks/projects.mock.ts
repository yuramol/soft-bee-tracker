import type { UserRole } from '@/lib/api/auth';
import type { ProjectStatus } from '@/lib/api/projects';

// Layout-only mock until projects get descriptions, links and members in the backend.
// People ids and project names match MOCK_CREW so Crew and Projects tell the same story.
export const MOCK_PROJECTS: ProjectRecord[] = [
  {
    id: 'p1',
    name: 'Atlas CRM',
    description:
      'Customer relationship platform for a logistics client.\n\nCurrent focus:\n- Checkout flow rebuild\n- Reporting exports for the sales team\n\nStand-up at 10:00, demo every second Friday.',
    managerId: 'u2',
    status: 'active',
    memberIds: ['u2', 'u3', 'u4'],
    links: [
      { label: 'Jira board', url: 'https://softbee.atlassian.net/jira/software/projects/ATL/boards/1' },
      { label: 'Repository', url: 'https://github.com/softbee/atlas-crm' },
      { label: 'Documentation', url: 'https://docs.softbee.dev/atlas' }
    ],
    weekMinutesByMember: { u3: 960, u4: 720 },
    version: 1
  },
  {
    id: 'p2',
    name: 'Nova Mobile',
    description:
      'iOS and Android app for booking fitness classes.\n\nRelease train every two weeks; designs are final once approved in Figma.',
    managerId: 'u2',
    status: 'active',
    memberIds: ['u2', 'u6'],
    links: [
      { label: 'Figma', url: 'https://www.figma.com/file/nova-mobile' },
      { label: 'Staging', url: 'https://staging.nova.softbee.dev' }
    ],
    weekMinutesByMember: { u2: 660, u6: 840 },
    version: 1
  },
  {
    id: 'p3',
    name: 'Helios API',
    description: 'Public API and integrations for the Helios energy dashboard.',
    managerId: 'u1',
    status: 'active',
    memberIds: ['u1', 'u4'],
    links: [{ label: 'Repository', url: 'https://github.com/softbee/helios-api' }],
    weekMinutesByMember: { u4: 480 },
    version: 1
  },
  {
    id: 'p4',
    name: 'Internal',
    description: 'Internal tools, hiring and operations.',
    managerId: 'u1',
    status: 'active',
    memberIds: ['u1', 'u3'],
    links: [],
    weekMinutesByMember: { u1: 900, u3: 240 },
    version: 1
  },
  {
    id: 'p5',
    name: 'Legacy Portal',
    description: 'Client portal maintained until the 2026 migration finished.',
    managerId: 'u2',
    status: 'archived',
    memberIds: ['u2', 'u5'],
    links: [],
    weekMinutesByMember: {},
    version: 3
  }
];

// The signed-in user is not part of the mock, so each role borrows a mock person:
// the admin, the manager with a team, and a staff member assigned to two projects
export function getMockProjectViewer(role: UserRole): ProjectViewer {
  return { id: MOCK_VIEWER_IDS[role], role };
}

const MOCK_VIEWER_IDS: Record<UserRole, string> = { admin: 'u1', manager: 'u2', worker: 'u3' };

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  managerId: string;
  status: ProjectStatus;
  memberIds: string[];
  links: ProjectLink[];
  weekMinutesByMember: Record<string, number>;
  // bumped on every save so concurrent edits are detected instead of silently overwritten
  version: number;
}

export interface ProjectViewer {
  id: string;
  role: UserRole;
}
