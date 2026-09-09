import { z } from 'zod';

import type { CreateProjectInput } from '@/lib/api/projects';

const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || z.url().safeParse(value).success, 'Enter a valid URL');

const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
  .or(z.literal(''));

export const createProjectFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Project name is required').max(255, 'Project name must be 255 characters or fewer'),
    client: z.string().trim().min(1, 'Client is required').max(255, 'Client must be 255 characters or fewer'),
    type: z.enum(['fixed_price', 'non_profit', 'time_material'], 'Select a project type'),
    note: z.string().trim(),
    pictureUrl: optionalUrlSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema
  })
  .refine(({ startDate, endDate }) => !startDate || !endDate || endDate >= startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate']
  });

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

export const CREATE_PROJECT_FORM_DEFAULTS: CreateProjectFormValues = {
  name: '',
  client: '',
  type: 'time_material',
  note: '',
  pictureUrl: '',
  startDate: '',
  endDate: ''
};

export function buildCreateProjectInput(values: CreateProjectFormValues): CreateProjectInput {
  return {
    name: values.name,
    client: values.client,
    type: values.type,
    note: values.note || null,
    pictureUrl: values.pictureUrl || null,
    startDate: values.startDate || null,
    endDate: values.endDate || null
  };
}
