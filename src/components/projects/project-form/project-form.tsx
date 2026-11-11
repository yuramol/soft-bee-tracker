'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useController, useFieldArray, useForm, useWatch, type FieldError as FormError, type UseFormRegister } from 'react-hook-form';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { FormField } from '@components/common/form/form-field';
import { ManagerSelect } from '@components/projects/manager-select';
import { Alert, AlertDescription, AlertTitle } from '@ui/alert';
import { Button } from '@ui/button';
import { FieldError } from '@ui/field';
import { Input } from '@ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Textarea } from '@ui/textarea';
import { Typography } from '@ui/typography';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { ProjectStatus } from '@/lib/api/projects';
import { formatText } from '@/lib/format-text';
import { buildProjectHref, type ProjectField, type ProjectUpdateResult, type ProjectUpdateValues } from '@/lib/projects';
import { EMPTY_PROJECT_LINK, projectFormSchema, type ProjectFormValues } from '@/lib/schemas/project-form.schema';
import schemaContent from '@/lib/schemas/content.json';
import { cn } from '@/lib/utils';
import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectRecord } from '@/mocks/projects.mock';
import content from '../content.json';

export function ProjectForm({ project, editableFields, managerCandidates, isNameTaken, onSave }: ProjectFormProps) {
  const [baseVersion, setBaseVersion] = useState(project.version);
  const [conflict, setConflict] = useState<ProjectRecord | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError
  } = useForm<ProjectFormValues>({ defaultValues: toFormValues(project), resolver: zodResolver(projectFormSchema) });
  const { fields: linkFields, append, remove, move } = useFieldArray({ control, name: 'links' });
  const { field: managerField } = useController({ control, name: 'managerId' });
  const { field: statusField } = useController({ control, name: 'status' });
  const linkValues = useWatch({ control, name: 'links' });
  const { isLeavePending, confirmLeave, cancelLeave } = useUnsavedChangesGuard(isDirty);

  const canEdit = (field: ProjectField) => editableFields.includes(field);
  const detailsHref = buildProjectHref(project.id);
  const isArchiving = project.status === 'active' && statusField.value === 'archived';

  function handleProjectSubmit(values: ProjectFormValues) {
    if (canEdit('name') && isNameTaken(values.name, project.id)) {
      setError('name', { message: schemaContent.project.nameTaken }, { shouldFocus: true });
      return;
    }

    const result = onSave(project, values satisfies ProjectUpdateValues, baseVersion);

    if (result.status === 'conflict') {
      setConflict(result.project);
    } else {
      // the saved values become the baseline so the leave guard lets the redirect through
      reset(toFormValues(result.project));
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleProjectSubmit)(event);
  }

  function handleReloadClick() {
    if (conflict) {
      reset(toFormValues(conflict));
      setBaseVersion(conflict.version);
      setConflict(null);
    }
  }

  function handleAddLinkClick() {
    append(EMPTY_PROJECT_LINK);
  }

  function handleLinkDragStart(index: number) {
    setDragIndex(index);
  }

  function handleLinkDragOver(index: number) {
    setDropIndex(index);
  }

  function handleLinkDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      move(dragIndex, index);
    }

    handleLinkDragEnd();
  }

  function handleLinkDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleStatusChange(value: ProjectStatus | null) {
    if (value) {
      statusField.onChange(value);
    }
  }

  function handleLeaveDialogOpenChange(open: boolean) {
    if (!open) {
      cancelLeave();
    }
  }

  return (
    <form className='flex flex-col gap-8' onSubmit={handleFormSubmit} noValidate>
      <div className='flex flex-col gap-6'>
        <Link
          href={detailsHref}
          className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-fit items-center gap-1.5 rounded-md text-sm outline-none focus-visible:ring-3'
        >
          <ArrowLeftIcon className='size-4' />
          {formatText(content.edit.back, { name: project.name })}
        </Link>
        <Typography variant='h3' tag='h1' className='font-semibold tracking-tight'>
          {content.edit.title}
        </Typography>
      </div>

      {conflict ? (
        <Alert variant='destructive'>
          <AlertTitle>{content.edit.conflict.title}</AlertTitle>
          <AlertDescription className='flex flex-col items-start gap-3'>
            <span>{content.edit.conflict.description}</span>
            <Button type='button' variant='outline' size='sm' onClick={handleReloadClick}>
              {content.edit.conflict.reload}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-12 xl:grid-cols-[minmax(0,1fr)_26rem]'>
        <div className='flex flex-col gap-6'>
          <FormField
            label={`${content.edit.nameLabel} *`}
            htmlFor='projectName'
            error={errors.name}
            description={canEdit('name') ? undefined : content.edit.lockedHint}
          >
            {canEdit('name') ? (
              <Input id='projectName' autoComplete='off' aria-invalid={Boolean(errors.name)} {...register('name')} />
            ) : (
              <Input id='projectName' value={project.name} disabled readOnly />
            )}
          </FormField>

          <FormField
            label={content.edit.descriptionLabel}
            htmlFor='projectDescription'
            error={errors.description}
            description={content.edit.descriptionHint}
          >
            <Textarea
              id='projectDescription'
              className='h-48 px-3.5 py-3'
              placeholder={content.edit.descriptionPlaceholder}
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
          </FormField>
        </div>

        <div className='flex flex-col gap-6'>
          <FormField
            label={`${content.edit.managerLabel} *`}
            htmlFor='projectManager'
            error={errors.managerId}
            description={canEdit('managerId') ? content.edit.managerHint : content.edit.lockedHint}
          >
            <ManagerSelect
              id='projectManager'
              value={managerField.value}
              candidates={managerCandidates}
              placeholder={content.edit.managerPlaceholder}
              isDisabled={!canEdit('managerId')}
              isInvalid={Boolean(errors.managerId)}
              onChange={managerField.onChange}
            />
          </FormField>

          <FormField
            label={content.edit.statusLabel}
            htmlFor='projectEditStatus'
            description={!canEdit('status') ? content.edit.lockedHint : isArchiving ? content.edit.archiveHint : undefined}
          >
            <Select<ProjectStatus>
              value={statusField.value}
              onValueChange={handleStatusChange}
              items={STATUS_OPTIONS}
              disabled={!canEdit('status')}
            >
              <SelectTrigger id='projectEditStatus' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      <section aria-labelledby='project-links-heading' className='flex flex-col gap-4'>
        <h2 id='project-links-heading' className='text-xl font-semibold'>
          {content.edit.linksTitle}
        </h2>

        {linkFields.length > 0 ? (
          <ol className='flex flex-col gap-4'>
            {linkFields.map((field, index) => (
              <LinkRow
                key={field.id}
                index={index}
                count={linkFields.length}
                displayLabel={linkValues[index]?.label.trim() || formatText(content.edit.untitledLink, { index: index + 1 })}
                errors={errors.links?.[index]}
                register={register}
                isDragActive={dragIndex !== null}
                isDragging={dragIndex === index}
                isDropTarget={dropIndex === index && dragIndex !== index}
                onMove={move}
                onRemove={remove}
                onDragStart={handleLinkDragStart}
                onDragOver={handleLinkDragOver}
                onDrop={handleLinkDrop}
                onDragEnd={handleLinkDragEnd}
              />
            ))}
          </ol>
        ) : (
          <p className='text-muted-foreground text-sm'>{content.edit.noLinks}</p>
        )}

        <FieldError errors={[errors.links?.root, errors.links?.message ? { message: errors.links.message } : undefined]} />

        <Button type='button' variant='outline' className='w-fit' onClick={handleAddLinkClick}>
          <PlusIcon data-icon='inline-start' />
          {content.edit.addLink}
        </Button>

        <p className='text-muted-foreground text-sm'>{content.edit.membershipNote}</p>
      </section>

      <div className='flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end'>
        {isDirty ? (
          <p role='status' className='text-muted-foreground text-sm sm:mr-auto'>
            {content.edit.unsavedHint}
          </p>
        ) : null}
        <Button variant='outline' render={<Link href={detailsHref} />} nativeButton={false}>
          {content.edit.cancel}
        </Button>
        <Button type='submit' disabled={!isDirty}>
          {content.edit.save}
        </Button>
      </div>

      <ConfirmDialog
        open={isLeavePending}
        onOpenChange={handleLeaveDialogOpenChange}
        title={content.edit.leaveDialog.title}
        description={content.edit.leaveDialog.description}
        confirmLabel={content.edit.leaveDialog.confirmButton}
        isDestructive
        onConfirm={confirmLeave}
      />
    </form>
  );
}

function LinkRow({
  index,
  count,
  displayLabel,
  errors,
  register,
  isDragActive,
  isDragging,
  isDropTarget,
  onMove,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: LinkRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const labelId = `projectLinkLabel${index}`;
  const urlId = `projectLinkUrl${index}`;
  // the design shows column headers once; later rows keep their labels for screen readers
  const fieldClassName = index > 0 ? 'sm:[&>[data-slot=field-label]]:sr-only' : undefined;

  function handleMoveUpClick() {
    onMove(index, index - 1);
  }

  function handleMoveDownClick() {
    onMove(index, index + 1);
  }

  function handleRemoveClick() {
    onRemove(index);
  }

  // only the grip is draggable, so text in the inputs stays selectable;
  // the whole row is used as the drag preview
  function handleGripDragStart(event: React.DragEvent<HTMLSpanElement>) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));

    if (rowRef.current) {
      event.dataTransfer.setDragImage(rowRef.current, 16, 24);
    }

    onDragStart(index);
  }

  function handleRowDragOver(event: React.DragEvent<HTMLLIElement>) {
    if (!isDragActive) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOver(index);
  }

  function handleRowDrop(event: React.DragEvent<HTMLLIElement>) {
    if (isDragActive) {
      event.preventDefault();
      onDrop(index);
    }
  }

  return (
    <li
      ref={rowRef}
      data-dragging={isDragging}
      data-drop-target={isDropTarget}
      className={cn(
        'grid gap-3 rounded-xl transition-[opacity,box-shadow] sm:grid-cols-[auto_minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-start',
        'data-[drop-target=true]:ring-ring/50 data-[drop-target=true]:ring-offset-background data-[dragging=true]:opacity-40 data-[drop-target=true]:ring-2 data-[drop-target=true]:ring-offset-4'
      )}
      onDragOver={handleRowDragOver}
      onDrop={handleRowDrop}
    >
      <span
        draggable
        title={formatText(content.edit.dragHandle, { label: displayLabel })}
        className={cn(
          'text-muted-foreground hover:text-foreground hidden size-9 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing sm:mt-1.5 sm:flex',
          index === 0 && 'sm:mt-[2.125rem]'
        )}
        onDragStart={handleGripDragStart}
        onDragEnd={onDragEnd}
      >
        <GripVerticalIcon aria-hidden className='size-4' />
      </span>
      <FormField label={content.edit.linkLabel} htmlFor={labelId} error={errors?.label} className={fieldClassName}>
        <Input
          id={labelId}
          placeholder={content.edit.linkLabelPlaceholder}
          autoComplete='off'
          aria-invalid={Boolean(errors?.label)}
          {...register(`links.${index}.label`)}
        />
      </FormField>
      <FormField label={content.edit.linkUrl} htmlFor={urlId} error={errors?.url} className={fieldClassName}>
        <Input
          id={urlId}
          type='url'
          inputMode='url'
          placeholder={content.edit.linkUrlPlaceholder}
          autoComplete='off'
          aria-invalid={Boolean(errors?.url)}
          {...register(`links.${index}.url`)}
        />
      </FormField>
      <div className={cn('flex gap-1 sm:mt-1.5', index === 0 && 'sm:mt-[2.125rem]')}>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          disabled={index === 0}
          aria-label={formatText(content.edit.moveUp, { label: displayLabel })}
          onClick={handleMoveUpClick}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          disabled={index === count - 1}
          aria-label={formatText(content.edit.moveDown, { label: displayLabel })}
          onClick={handleMoveDownClick}
        >
          <ArrowDownIcon />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label={formatText(content.edit.removeLink, { label: displayLabel })}
          onClick={handleRemoveClick}
        >
          <Trash2Icon />
        </Button>
      </div>
    </li>
  );
}

function toFormValues(project: ProjectRecord): ProjectFormValues {
  return {
    name: project.name,
    managerId: project.managerId,
    description: project.description,
    status: project.status,
    links: project.links.map((link) => ({ label: link.label, url: link.url }))
  };
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'active', label: content.status.active },
  { value: 'archived', label: content.status.archived }
];

interface ProjectFormProps {
  project: ProjectRecord;
  editableFields: ProjectField[];
  managerCandidates: CrewMember[];
  isNameTaken: (name: string, exceptId?: string) => boolean;
  onSave: (project: ProjectRecord, values: ProjectUpdateValues, baseVersion: number) => ProjectUpdateResult;
}

interface LinkRowProps {
  index: number;
  count: number;
  displayLabel: string;
  errors?: { label?: FormError; url?: FormError };
  register: UseFormRegister<ProjectFormValues>;
  isDragActive: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}
