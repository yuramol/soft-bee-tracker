import type { ProfileFormValues } from '@/lib/schemas/profile-form.schema';
import content from '../content.json';

export const PROFILE_FORM_FIELDS: ProfileFormField[] = [
  { name: 'firstName', ...content.form.fields.firstName, autoComplete: 'given-name' },
  { name: 'lastName', ...content.form.fields.lastName, autoComplete: 'family-name' },
  { name: 'username', ...content.form.fields.username, autoComplete: 'username' },
  { name: 'phone', ...content.form.fields.phone, type: 'tel', autoComplete: 'tel' },
  { name: 'linkedin', ...content.form.fields.linkedin, type: 'url' },
  { name: 'upwork', ...content.form.fields.upwork, type: 'url' }
];

export interface ProfileFormField {
  name: keyof ProfileFormValues;
  label: string;
  placeholder: string;
  type?: 'text' | 'tel' | 'url';
  autoComplete?: string;
}
