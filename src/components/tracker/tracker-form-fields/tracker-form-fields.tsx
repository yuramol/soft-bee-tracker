'use client';

import { useController, type UseFormReturn } from 'react-hook-form';

import { DatePicker } from '@components/common/form/date-picker';
import { DurationPicker } from '@components/common/form/duration-picker';
import { ProjectSelect } from '@components/tracker/project-select/project-select';
import { Field, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Input } from '@ui/input';
import type { Project } from '@/lib/api/projects';
import type { TrackerFormValues } from '@/lib/schemas/tracker-form.schema';
import type { ApiError } from '@/types/api-error';
import { getEarliestOpenDateKey } from '@/lib/work-time-policy';
import content from '../content.json';

export function TrackerFormFields({ form, idPrefix, projects, isLoadingProjects, projectsError, isDisabled }: TrackerFormFieldsProps) {
  const {
    control,
    register,
    formState: { errors }
  } = form;
  const { field: projectField } = useController({ control, name: 'projectId' });
  const { field: dateField } = useController({ control, name: 'date' });
  const { field: durationField } = useController({ control, name: 'durationMinutes' });
  const ids = {
    project: `${idPrefix}ProjectId`,
    date: `${idPrefix}Date`,
    duration: `${idPrefix}DurationMinutes`,
    description: `${idPrefix}Description`
  };

  return (
    <FieldGroup className='grid gap-4 sm:grid-cols-2'>
      <Field className='sm:col-span-2' data-invalid={Boolean(errors.projectId) || Boolean(projectsError)}>
        <FieldLabel htmlFor={ids.project}>{content.form.projectLabel}</FieldLabel>
        <ProjectSelect
          id={ids.project}
          value={projectField.value}
          onChange={projectField.onChange}
          projects={projects}
          isLoading={isLoadingProjects}
          isDisabled={isDisabled || Boolean(projectsError)}
          isInvalid={Boolean(errors.projectId)}
        />
        {projectsError ? <FieldError>{projectsError.message}</FieldError> : <FieldError errors={[errors.projectId]} />}
      </Field>

      <Field data-invalid={Boolean(errors.date)}>
        <FieldLabel htmlFor={ids.date}>{content.form.dateLabel}</FieldLabel>
        <DatePicker
          id={ids.date}
          value={dateField.value}
          onChange={dateField.onChange}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.date)}
          minDate={getEarliestOpenDateKey(new Date())}
        />
        <FieldError errors={[errors.date]} />
      </Field>

      <Field data-invalid={Boolean(errors.durationMinutes)}>
        <FieldLabel htmlFor={ids.duration}>{content.form.durationLabel}</FieldLabel>
        <DurationPicker
          id={ids.duration}
          value={durationField.value}
          onChange={durationField.onChange}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.durationMinutes)}
        />
        <FieldError errors={[errors.durationMinutes]} />
      </Field>

      <Field className='sm:col-span-2' data-invalid={Boolean(errors.description)}>
        <FieldLabel htmlFor={ids.description}>{content.form.descriptionLabel}</FieldLabel>
        <Input
          id={ids.description}
          placeholder={content.form.descriptionPlaceholder}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.description)}
          {...register('description')}
        />
        <FieldError errors={[errors.description]} />
      </Field>
    </FieldGroup>
  );
}

interface TrackerFormFieldsProps {
  form: UseFormReturn<TrackerFormValues>;
  idPrefix: string;
  projects: Project[];
  isLoadingProjects: boolean;
  projectsError: ApiError | null;
  isDisabled: boolean;
}
