import { describe, expect, it } from 'vitest';

import { AVATAR_MAX_BYTES, AVATAR_SOURCE_MAX_BYTES, buildAvatarPath, validateAvatarFile } from '@/lib/avatar';

describe('validateAvatarFile', () => {
  it('accepts supported images within the size limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 1024 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/jpeg', size: AVATAR_MAX_BYTES })).toBeNull();
  });

  it('rejects other types, oversized and empty files', () => {
    expect(validateAvatarFile({ type: 'image/svg+xml', size: 1024 })).toMatch(/JPG/);
    expect(validateAvatarFile({ type: 'application/pdf', size: 1024 })).toMatch(/JPG/);
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toMatch(/2 MB/);
    expect(validateAvatarFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
  });

  it('accepts larger source photos when given the source limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 5 * 1024 * 1024 }, AVATAR_SOURCE_MAX_BYTES)).toBeNull();
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_SOURCE_MAX_BYTES + 1 }, AVATAR_SOURCE_MAX_BYTES)).toMatch(/10 MB/);
  });
});

describe('buildAvatarPath', () => {
  it('stores the file in the owner folder with a unique name', () => {
    expect(buildAvatarPath('user-1', { type: 'image/webp' }, 1700000000000)).toBe('user-1/avatar-1700000000000.webp');
  });
});
