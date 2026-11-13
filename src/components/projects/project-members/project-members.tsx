'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { DetailsCard } from '@components/projects/details-card';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { getFullName } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import { getShortName } from '@/lib/projects';
import type { CrewMember } from '@/mocks/crew.mock';
import type { ProjectRecord } from '@/mocks/projects.mock';
import content from '../content.json';

export function ProjectMembers({ project, peopleById, canManage, addableMembers, isAdmin, onAdd, onRemove }: ProjectMembersProps) {
  const [pendingRemoval, setPendingRemoval] = useState<CrewMember | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const members = project.memberIds.flatMap((id) => peopleById.get(id) ?? []);

  function handleRemoveRequest(member: CrewMember) {
    setPendingRemoval(member);
    setIsRemoveDialogOpen(true);
  }

  function handleRemoveConfirm() {
    if (pendingRemoval) {
      onRemove(project, pendingRemoval);
    }

    setIsRemoveDialogOpen(false);
  }

  function handleAdd(member: CrewMember) {
    onAdd(project, member);
  }

  return (
    <DetailsCard
      title={content.details.members.title}
      titleId='project-members-title'
      action={
        canManage ? <AddMemberDialog projectName={project.name} candidates={addableMembers} isAdmin={isAdmin} onAdd={handleAdd} /> : null
      }
    >
      {members.length > 0 ? (
        <ul className='flex flex-col divide-y'>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isResponsible={member.id === project.managerId}
              canRemove={canManage}
              onRemove={handleRemoveRequest}
            />
          ))}
        </ul>
      ) : (
        <p className='text-muted-foreground text-sm'>{content.details.members.empty}</p>
      )}

      {pendingRemoval ? (
        <ConfirmDialog
          open={isRemoveDialogOpen}
          onOpenChange={setIsRemoveDialogOpen}
          title={formatText(content.details.members.removeDialog.title, { name: getFullName(pendingRemoval), project: project.name })}
          description={content.details.members.removeDialog.description}
          confirmLabel={content.details.members.removeDialog.confirmButton}
          isDestructive
          onConfirm={handleRemoveConfirm}
        />
      ) : null}
    </DetailsCard>
  );
}

function MemberRow({ member, isResponsible, canRemove, onRemove }: MemberRowProps) {
  function handleRemoveClick() {
    onRemove(member);
  }

  return (
    <li className='grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2 sm:grid-cols-[minmax(0,1fr)_8rem_7rem]'>
      <span className='truncate' title={getFullName(member)}>
        {getShortName(member)}
      </span>
      <span className='text-muted-foreground sm:text-foreground col-start-1 row-start-2 text-sm sm:col-start-2 sm:row-start-1 sm:text-base'>
        {content.roles[member.role]}
      </span>
      <div className='col-start-2 row-span-2 row-start-1 flex justify-end sm:col-start-3 sm:row-span-1'>
        {isResponsible ? (
          <span className='text-muted-foreground text-xs'>{content.details.members.responsible}</span>
        ) : canRemove ? (
          <Button
            variant='outline'
            size='sm'
            aria-label={formatText(content.details.members.removeLabel, { name: getFullName(member) })}
            onClick={handleRemoveClick}
          >
            {content.details.members.remove}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function AddMemberDialog({ projectName, candidates, isAdmin, onAdd }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const options = candidates.map((member) => ({ value: member.id, label: `${getFullName(member)} · ${member.position}` }));
  const selected = candidates.find((member) => member.id === selectedId);
  const scopeHint = isAdmin ? content.addMember.adminScope : content.addMember.managerScope;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setSelectedId(null);
  }

  function handleCancelClick() {
    handleOpenChange(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selected) {
      onAdd(selected);
      handleOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant='outline' />}>
        <PlusIcon data-icon='inline-start' />
        {content.details.members.add}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{formatText(content.addMember.title, { project: projectName })}</DialogTitle>
          <DialogDescription>{content.addMember.description}</DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor='addProjectMember'>{content.addMember.personLabel}</FieldLabel>
            <Select<string> value={selectedId} onValueChange={setSelectedId} items={options} disabled={options.length === 0}>
              <SelectTrigger id='addProjectMember' className='w-full'>
                <SelectValue placeholder={content.addMember.personPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{options.length === 0 ? content.addMember.nobodyLeft : scopeHint}</FieldDescription>
          </Field>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleCancelClick}>
              {content.addMember.cancel}
            </Button>
            <Button type='submit' disabled={!selected}>
              {content.addMember.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectMembersProps {
  project: ProjectRecord;
  peopleById: Map<string, CrewMember>;
  canManage: boolean;
  addableMembers: CrewMember[];
  isAdmin: boolean;
  onAdd: (project: ProjectRecord, member: CrewMember) => void;
  onRemove: (project: ProjectRecord, member: CrewMember) => void;
}

interface MemberRowProps {
  member: CrewMember;
  isResponsible: boolean;
  canRemove: boolean;
  onRemove: (member: CrewMember) => void;
}

interface AddMemberDialogProps {
  projectName: string;
  candidates: CrewMember[];
  isAdmin: boolean;
  onAdd: (member: CrewMember) => void;
}
