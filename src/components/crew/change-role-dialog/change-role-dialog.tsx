'use client';

import { useState } from 'react';

import { FormField } from '@components/common/form/form-field';
import { ROLE_OPTIONS } from '@components/crew/role-badge';
import { Button } from '@ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import type { UserRole } from '@/lib/api/auth';
import type { CrewMember } from '@/mocks/crew.mock';
import { formatText } from '@/lib/format-text';
import content from '../content.json';

export function ChangeRoleDialog({ member, open, onOpenChange, onConfirm }: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role);
  const isUnchanged = selectedRole === member.role;

  function handleRoleChange(value: UserRole | null) {
    if (value) {
      setSelectedRole(value);
    }
  }

  function handleSaveClick() {
    onConfirm(member, selectedRole);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{content.changeRoleDialog.title}</DialogTitle>
          <DialogDescription>
            {formatText(content.changeRoleDialog.description, { name: `${member.firstName} ${member.lastName}` })}
          </DialogDescription>
        </DialogHeader>

        <FormField label={content.changeRoleDialog.roleLabel} htmlFor='memberRole' description={ROLE_DESCRIPTIONS[selectedRole]}>
          <Select<UserRole> value={selectedRole} onValueChange={handleRoleChange} items={ROLE_OPTIONS}>
            <SelectTrigger id='memberRole' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <DialogFooter>
          <DialogClose render={<Button variant='outline' />}>{content.changeRoleDialog.cancelButton}</DialogClose>
          <Button disabled={isUnchanged} onClick={handleSaveClick}>
            {content.changeRoleDialog.saveButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = content.roleDescriptions;

interface ChangeRoleDialogProps {
  member: CrewMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (member: CrewMember, role: UserRole) => void;
}
