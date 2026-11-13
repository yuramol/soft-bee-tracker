import { z } from 'zod';

import { containsSecret, hasSecretUrlParams, isWebUrl } from '@/lib/projects';
import content from './content.json';

const projectLinkSchema = z.object({
  label: z.string().trim().min(1, content.project.linkLabelRequired).max(80, content.project.linkLabelTooLong),
  url: z
    .string()
    .trim()
    .min(1, content.project.linkUrlRequired)
    .refine(isWebUrl, content.project.linkUrlInvalid)
    .refine((value) => !hasSecretUrlParams(value), content.project.linkUrlSecret)
});

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, content.project.nameRequired).max(255, content.project.nameTooLong),
  client: z.string().trim().max(255, content.project.clientTooLong),
  managerId: z.string().min(1, content.project.managerRequired),
  description: z
    .string()
    .trim()
    .max(5000, content.project.descriptionTooLong)
    .refine((value) => !containsSecret(value), content.project.descriptionSecret),
  status: z.enum(['active', 'archived']),
  links: z.array(projectLinkSchema).max(20, content.project.tooManyLinks)
});

export const createProjectFormSchema = projectFormSchema
  .pick({ name: true, client: true, managerId: true, description: true })
  .extend({ managerIds: z.array(z.string()).max(20, content.project.tooManyManagers) });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

export const EMPTY_PROJECT_LINK: ProjectFormValues['links'][number] = { label: '', url: '' };
