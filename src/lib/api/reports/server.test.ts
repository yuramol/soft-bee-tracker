import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => Promise.resolve({ rpc, from })
}));

// node-only unit test of the server helper; the rule guards client bundles
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { getReportSource } from '@/lib/api/reports/server';

describe('getReportSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps time, leave, people and projects for the range', async () => {
    const leaveQuery = mockTables();

    mockRpc({});

    await expect(getReportSource(RANGE)).resolves.toEqual({
      entries: [{ memberId: 'u3', projectId: 'p1', minutes: 480 }],
      absences: [{ id: 'a1', memberId: 'u3', leaveType: 'vacation', startDate: '2026-11-10', endDate: '2026-11-11' }],
      people: [{ id: 'u3', firstName: 'Alex', lastName: 'Smith', role: 'worker', position: null, status: 'active' }],
      projects: [expect.objectContaining({ id: 'p1', name: 'Fundayo', managerId: 'u2', memberIds: ['u2', 'u3'] })]
    });
    expect(rpc).toHaveBeenCalledWith('get_report_time', { from_date: RANGE.from, to_date: RANGE.to });
    expect(leaveQuery.eq).toHaveBeenCalledWith('status', 'approved');
    expect(leaveQuery.lte).toHaveBeenCalledWith('start_date', RANGE.to);
    expect(leaveQuery.gte).toHaveBeenCalledWith('end_date', RANGE.from);
  });

  it('throws an ApiError when any read fails', async () => {
    mockTables();
    mockRpc({ get_project_members: { data: null, error: { message: 'permission denied' }, status: 403 } });

    await expect(getReportSource(RANGE)).rejects.toEqual({ message: 'permission denied', statusCode: 403 });
  });
});

function mockRpc(overrides: Record<string, QueryResult>) {
  const results: Record<string, QueryResult> = {
    get_report_time: ok([{ user_id: 'u3', project_id: 'p1', minutes: 480 }]),
    get_project_members: ok([
      { project_id: 'p1', user_id: 'u2' },
      { project_id: 'p1', user_id: 'u3' }
    ]),
    get_project_people: ok([
      { id: 'u3', first_name: 'Alex', last_name: 'Smith', role: 'worker', positions: [], is_confirmed: true, is_blocked: false }
    ]),
    ...overrides
  };

  rpc.mockImplementation((name: string) => Promise.resolve(results[name]));
}

function mockTables() {
  const leaveQuery = {
    eq: vi.fn(() => leaveQuery),
    lte: vi.fn(() => leaveQuery),
    gte: vi.fn(() =>
      Promise.resolve(ok([{ id: 'a1', user_id: 'u3', leave_type: 'vacation', start_date: '2026-11-10', end_date: '2026-11-11' }]))
    )
  };
  const projectsResult = ok([
    {
      id: 'p1',
      created_at: '',
      updated_at: '2026-11-01T00:00:00Z',
      name: 'Fundayo',
      client: '',
      note: null,
      picture_url: null,
      start_date: null,
      end_date: null,
      status: 'active',
      type: 'time_material',
      manager_id: 'u2',
      links: []
    }
  ]);

  from.mockImplementation((table: string) => ({
    select: () => (table === 'leave_requests' ? leaveQuery : Promise.resolve(projectsResult))
  }));

  return leaveQuery;
}

function ok(data: object[]): QueryResult {
  return { data, error: null, status: 200 };
}

const RANGE = { from: '2026-11-09', to: '2026-11-15' };

interface QueryResult {
  data: object[] | null;
  error: { message: string } | null;
  status: number;
}
