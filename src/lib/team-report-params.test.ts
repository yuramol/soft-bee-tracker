import { describe, expect, it } from 'vitest';

import { buildTeamReportHref, parseTeamReportParams } from '@/lib/team-report-params';

describe('buildTeamReportHref', () => {
  it('carries the period and member ids', () => {
    expect(buildTeamReportHref({ period: 'this-week', memberIds: ['u3', 'u4'] })).toBe('/reports?period=this-week&members=u3%2Cu4');
  });

  it('omits members when the list is empty', () => {
    expect(buildTeamReportHref({ period: 'this-month', memberIds: [] })).toBe('/reports?period=this-month');
  });
});

describe('parseTeamReportParams', () => {
  it('reads a valid period and member ids', () => {
    expect(parseTeamReportParams({ period: 'this-week', members: 'u3,u4' })).toEqual({ period: 'this-week', memberIds: ['u3', 'u4'] });
  });

  it('ignores an unknown period and missing members', () => {
    expect(parseTeamReportParams({ period: 'yesterday' })).toEqual({ period: null, memberIds: null });
  });

  it('uses the first value of repeated params', () => {
    expect(parseTeamReportParams({ period: ['last-month', 'this-week'], members: ['u1'] })).toEqual({
      period: 'last-month',
      memberIds: ['u1']
    });
  });
});
