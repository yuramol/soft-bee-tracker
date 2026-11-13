import { formatText } from '@/lib/format-text';
import content from './avatar.content.json';

export const AVATAR_BUCKET = 'avatars';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

// the picked photo is cropped and re-encoded before upload, so it may be larger than the stored one
export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024;

export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const AVATAR_ACCEPT = AVATAR_MIME_TYPES.join(',');

export function validateAvatarFile(file: Pick<File, 'type' | 'size'>, maxBytes = AVATAR_MAX_BYTES): string | null {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return content.invalidType;
  }

  if (file.size > maxBytes) {
    return formatText(content.tooLarge, { size: maxBytes / 1024 / 1024 });
  }

  return file.size === 0 ? content.empty : null;
}

// a fresh name per upload keeps cdn and browser caches from serving the old photo
export function buildAvatarPath(userId: string, file: Pick<File, 'type'>, timestamp: number): string {
  return `${userId}/avatar-${timestamp}.${AVATAR_EXTENSIONS[file.type] ?? 'img'}`;
}

const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
