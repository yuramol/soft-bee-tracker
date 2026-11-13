'use client';

import type { ReactElement } from 'react';

import { Button } from '@ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import content from '../content.json';

export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = content.confirmDialog.confirmButton,
  isDestructive = false,
  isBusy = false,
  onConfirm
}: ConfirmDialogProps) {
  function handleConfirmClick() {
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant='outline' disabled={isBusy} />}>{content.confirmDialog.cancelButton}</DialogClose>
          <Button variant={isDestructive ? 'destructive' : 'default'} disabled={isBusy} onClick={handleConfirmClick}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isBusy?: boolean;
  onConfirm: () => void;
}
