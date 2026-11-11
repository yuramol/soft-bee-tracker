import { describe, expect, it } from 'vitest';

import { buildTeamReportHref, isReportPeriod } from '@/lib/team-report-params';

describe('buildTeamReportHref', () => {
  it('carries the period and member ids', () => {
    expect(buildTeamReportHref({ period: 'this-week', memberIds: ['u3', 'u4'] })).toBe('/reports?period=this-week&members=u3%2Cu4');
  });

  it('carries project ids for project report links', () => {
    expect(buildTeamReportHref({ period: 'this-week', projectIds: ['p1'] })).toBe('/reports?period=this-week&projects=p1');
  });

  it('omits members when the list is empty', () => {
    expect(buildTeamReportHref({ period: 'this-month', memberIds: [] })).toBe('/reports?period=this-month');
  });
});

describe('isReportPeriod', () => {
  it('accepts known presets only', () => {
    expect(isReportPeriod('last-week')).toBe(true);
    expect(isReportPeriod('yesterday')).toBe(false);
    expect(isReportPeriod(undefined)).toBe(false);
  });
});
