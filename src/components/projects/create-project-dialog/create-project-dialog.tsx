'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';

import { FormField } from '@components/common/form/form-field';
import { ManagerSelect } from '@components/projects/manager-select';
import { ProjectManagersSelect } from '@components/projects/project-managers-select';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { FieldGroup } from '@ui/field';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import type { ProjectPerson } from '@/lib/api/users';
import type { CreateProjectValues, ProjectSubmitOutcome } from '@/lib/projects';
import { createProjectFormSchema, type CreateProjectFormValues } from '@/lib/schemas/project-form.schema';
import schemaContent from '@/lib/schemas/content.json';
import content from '../content.json';

export function CreateProjectDialog({
  viewerId,
  canChooseManager,
  isCreatorKept,
  managerCandidates,
  isNameTaken,
  onCreate
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const defaultValues: CreateProjectFormValues = { name: '', client: '', description: '', managerId: viewerId, managerIds: [] };
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError
  } = useForm<CreateProjectFormValues>({ defaultValues, resolver: zodResolver(createProjectFormSchema) });
  const { field: managerField } = useController({ control, name: 'managerId' });
  const { field: managersField } = useController({ control, name: 'managerIds' });
  // the responsible person already manages the project, so they aren't offered twice
  const coManagerCandidates = managerCandidates.filter((person) => person.id !== managerField.value);

  function handleResponsibleChange(nextId: string) {
    managerField.onChange(nextId);
    managersField.onChange(managersField.value.filter((id) => id !== nextId));
  }

  async function handleProjectSubmit(values: CreateProjectFormValues) {
    if (isNameTaken(values.name)) {
      setError('name', { message: schemaContent.project.nameTaken }, { shouldFocus: true });
      return;
    }

    // managers without the grant to choose always own what they create
    const outcome = await onCreate({ ...values, managerId: canChooseManager ? values.managerId : viewerId } satisfies CreateProjectValues);

    if (outcome === 'name-taken') {
      setError('name', { message: schemaContent.project.nameTaken }, { shouldFocus: true });
    } else if (outcome === 'saved') {
      reset(defaultValues);
      setOpen(false);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleProjectSubmit)(event);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset(defaultValues);
    }

    setOpen(nextOpen);
  }

  function handleCancelClick() {
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size='lg' />}>
        <PlusIcon data-icon='inline-start' />
        {content.create.trigger}
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{content.create.title}</DialogTitle>
          <DialogDescription>{content.create.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleFormSubmit} noValidate>
          <FieldGroup className='gap-4'>
            <FormField label={`${content.create.nameLabel} *`} htmlFor='createProjectName' error={errors.name}>
              <Input
                id='createProjectName'
                placeholder={content.create.namePlaceholder}
                autoComplete='off'
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
            </FormField>

            <FormField label={content.create.clientLabel} htmlFor='createProjectClient' error={errors.client}>
              <Input
                id='createProjectClient'
                placeholder={content.create.clientPlaceholder}
                autoComplete='organization'
                aria-invalid={Boolean(errors.client)}
                {...register('client')}
              />
            </FormField>

            <FormField
              label={`${content.create.managerLabel} *`}
              htmlFor='createProjectManager'
              error={errors.managerId}
              description={getManagerHint(canChooseManager, isCreatorKept && managerField.value !== viewerId)}
            >
              <ManagerSelect
                id='createProjectManager'
                value={managerField.value}
                candidates={managerCandidates}
                placeholder={content.create.managerPlaceholder}
                isDisabled={!canChooseManager}
                isInvalid={Boolean(errors.managerId)}
                onChange={handleResponsibleChange}
              />
            </FormField>

            <FormField
              label={content.create.managersLabel}
              htmlFor='createProjectManagers'
              error={errors.managerIds}
              description={content.create.managersHint}
            >
              <ProjectManagersSelect
                id='createProjectManagers'
                value={managersField.value}
                candidates={coManagerCandidates}
                isInvalid={Boolean(errors.managerIds)}
                onChange={managersField.onChange}
              />
            </FormField>

            <FormField label={content.create.descriptionLabel} htmlFor='createProjectDescription' error={errors.description}>
              <Textarea
                id='createProjectDescription'
                rows={4}
                className='px-3.5 py-3'
                placeholder={content.create.descriptionPlaceholder}
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
            </FormField>
          </FieldGroup>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleCancelClick}>
              {content.create.cancel}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {content.create.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getManagerHint(canChooseManager: boolean, isHandingOver: boolean): string | undefined {
  if (!canChooseManager) {
    return content.create.managerSelfHint;
  }

  return isHandingOver ? content.create.managerKeepHint : undefined;
}

interface CreateProjectDialogProps {
  viewerId: string;
  canChooseManager: boolean;
  // a creating manager stays on as a project manager when choosing someone else
  isCreatorKept: boolean;
  managerCandidates: ProjectPerson[];
  isNameTaken: (name: string) => boolean;
  onCreate: (values: CreateProjectValues) => Promise<ProjectSubmitOutcome>;
}
