import { describe, expect, it } from 'vitest';

import { formatText } from '@/lib/format-text';

describe('formatText', () => {
  it('replaces placeholders with values', () => {
    expect(formatText('Archive {name}?', { name: 'Acme' })).toBe('Archive Acme?');
    expect(formatText('{count} people', { count: 3 })).toBe('3 people');
  });

  it('keeps placeholders without a value', () => {
    expect(formatText('Hi, {name}', {})).toBe('Hi, {name}');
  });
});
