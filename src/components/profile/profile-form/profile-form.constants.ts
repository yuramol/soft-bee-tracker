import type { ProfileFormValues } from '@/lib/schemas/profile-form.schema';

export const PROFILE_FORM_FIELDS: ProfileFormField[] = [
  { name: 'firstName', label: 'First name', placeholder: 'John', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last name', placeholder: 'Doe', autoComplete: 'family-name' },
  { name: 'username', label: 'Username', placeholder: 'johndoe', autoComplete: 'username' },
  { name: 'phone', label: 'Phone', placeholder: '+1 555 123 4567', type: 'tel', autoComplete: 'tel' },
  {
    name: 'avatarUrl',
    label: 'Avatar URL',
    placeholder: 'https://example.com/avatar.png',
    type: 'url',
    description: 'Shown in the sidebar. Leave empty to fall back to your initials.'
  },
  { name: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/johndoe', type: 'url' },
  { name: 'upwork', label: 'Upwork', placeholder: 'https://upwork.com/freelancers/johndoe', type: 'url' }
];

export interface ProfileFormField {
  name: keyof ProfileFormValues;
  label: string;
  placeholder: string;
  type?: 'text' | 'tel' | 'url';
  autoComplete?: string;
  description?: string;
}
