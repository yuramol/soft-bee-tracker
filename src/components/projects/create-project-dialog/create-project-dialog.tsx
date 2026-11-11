'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';

import { FormField } from '@components/common/form/form-field';
import { ManagerSelect } from '@components/projects/manager-select';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { FieldGroup } from '@ui/field';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import type { CreateProjectValues } from '@/lib/projects';
import { createProjectFormSchema, type CreateProjectFormValues } from '@/lib/schemas/project-form.schema';
import schemaContent from '@/lib/schemas/content.json';
import type { CrewMember } from '@/mocks/crew.mock';
import content from '../content.json';

export function CreateProjectDialog({ viewerId, canChooseManager, managerCandidates, isNameTaken, onCreate }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const defaultValues: CreateProjectFormValues = { name: '', description: '', managerId: viewerId };
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError
  } = useForm<CreateProjectFormValues>({ defaultValues, resolver: zodResolver(createProjectFormSchema) });
  const { field: managerField } = useController({ control, name: 'managerId' });

  function handleProjectSubmit(values: CreateProjectFormValues) {
    if (isNameTaken(values.name)) {
      setError('name', { message: schemaContent.project.nameTaken }, { shouldFocus: true });
      return;
    }

    // managers without the grant to choose always own what they create
    onCreate({ ...values, managerId: canChooseManager ? values.managerId : viewerId } satisfies CreateProjectValues);
    reset(defaultValues);
    setOpen(false);
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

            <FormField
              label={`${content.create.managerLabel} *`}
              htmlFor='createProjectManager'
              error={errors.managerId}
              description={canChooseManager ? undefined : content.create.managerSelfHint}
            >
              <ManagerSelect
                id='createProjectManager'
                value={managerField.value}
                candidates={managerCandidates}
                placeholder={content.create.managerPlaceholder}
                isDisabled={!canChooseManager}
                isInvalid={Boolean(errors.managerId)}
                onChange={managerField.onChange}
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
            <Button type='submit'>{content.create.submit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CreateProjectDialogProps {
  viewerId: string;
  canChooseManager: boolean;
  managerCandidates: CrewMember[];
  isNameTaken: (name: string) => boolean;
  onCreate: (values: CreateProjectValues) => void;
}
