import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// avatar images are optional, so the dropdown falls back to initials:
// first + last name, then the first character of username or email
export function getUserAvatarFallback(user: AvatarFallbackUser): string {
  return `${firstCharOf(user.firstName)}${firstCharOf(user.lastName)}`;
}

function firstCharOf(value: string | null | undefined): string {
  return value?.trim().charAt(0) ?? '';
}

export interface AvatarFallbackUser {
  firstName?: string | null;
  lastName?: string | null;
}
