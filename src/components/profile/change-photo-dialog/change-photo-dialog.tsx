'use client';

import { CameraIcon, ImageUpIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { AvatarCropper } from '@components/profile/change-photo-dialog/avatar-cropper';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@ui/dialog';
import { useRemoveAvatar, useUploadAvatar } from '@/lib/api/auth';
import type { UserProfile } from '@/lib/api/auth';
import { AVATAR_ACCEPT, AVATAR_SOURCE_MAX_BYTES, validateAvatarFile } from '@/lib/avatar';
import { INITIAL_CROP, renderCroppedAvatar, type AvatarCrop } from '@/lib/avatar-crop';
import { getProfileDisplayName } from '@/lib/profile';
import { cn, getUserAvatarFallback } from '@/lib/utils';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function ChangePhotoDialog({ profile }: ChangePhotoDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState<PhotoSelection | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState<AvatarCrop>(INITIAL_CROP);
  const [isPreparing, setIsPreparing] = useState(false);
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

  const isBusy = isPreparing || uploadAvatar.isPending || removeAvatar.isPending;

  function replaceSelection(next: PhotoSelection | null) {
    // object urls hold the file in memory until revoked
    if (selection) {
      URL.revokeObjectURL(selection.previewUrl);
    }

    setSelection(next);
    setCrop(INITIAL_CROP);
  }

  function selectFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const error = validateAvatarFile(file, AVATAR_SOURCE_MAX_BYTES);
    setFileError(error);
    replaceSelection(error ? null : { file, previewUrl: URL.createObjectURL(file) });
  }

  function closeDialog() {
    replaceSelection(null);
    setFileError(null);
    setIsOpen(false);
  }

  function handleSaved(message: string) {
    toast.success(message);
    closeDialog();
    // the header avatar and summary card are server-rendered from the same row
    router.refresh();
  }

  function handleFailed(error: ApiError) {
    toast.error(error.message);
  }

  async function uploadCroppedAvatar(current: PhotoSelection) {
    setIsPreparing(true);

    try {
      const file = await renderCroppedAvatar(current.previewUrl, crop, current.file.name);
      uploadAvatar.mutate(file, { onSuccess: handleUploaded, onError: handleFailed });
    } catch {
      toast.error(content.photo.processFailed);
    } finally {
      setIsPreparing(false);
    }
  }

  function handleSaveClick() {
    if (selection) {
      void uploadCroppedAvatar(selection);
    }
  }

  function handleUploaded() {
    handleSaved(content.photo.saved);
  }

  function handleRemoveClick() {
    removeAvatar.mutate(undefined, { onSuccess: handleRemoved, onError: handleFailed });
  }

  function handleRemoved() {
    handleSaved(content.photo.removed);
  }

  function handleBrowseClick() {
    inputRef.current?.click();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    // clearing lets the same file be picked again after a validation error
    event.target.value = '';
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!isBusy) {
      selectFile(event.dataTransfer.files[0]);
    }
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      setIsOpen(true);
    } else if (!isBusy) {
      closeDialog();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant='outline' size='sm' />}>
        <CameraIcon data-icon='inline-start' />
        {content.photo.trigger}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{content.photo.title}</DialogTitle>
          <DialogDescription>{content.photo.description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col items-center gap-4'>
          {selection ? (
            <>
              <AvatarCropper src={selection.previewUrl} crop={crop} disabled={isBusy} onCropChange={setCrop} />
              <Button type='button' variant='outline' size='sm' disabled={isBusy} onClick={handleBrowseClick}>
                <RefreshCwIcon data-icon='inline-start' />
                {content.photo.chooseAnother}
              </Button>
            </>
          ) : (
            <>
              <Avatar aria-label={content.photo.previewLabel} className='size-28'>
                {profile.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={getProfileDisplayName(profile)} className='object-cover' />
                ) : null}
                <AvatarFallback className='text-3xl font-semibold'>{getUserAvatarFallback(profile)}</AvatarFallback>
              </Avatar>

              <button
                type='button'
                disabled={isBusy}
                onClick={handleBrowseClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                aria-describedby='avatar-file-hint'
                className={cn(
                  'hover:border-foreground/40 hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50',
                  isDragging && 'border-foreground/60 bg-muted/60',
                  fileError && 'border-destructive'
                )}
              >
                <ImageUpIcon className='text-muted-foreground size-6' />
                <span className='text-sm font-medium'>{content.photo.chooseFile}</span>
                <span id='avatar-file-hint' className='text-muted-foreground text-xs'>
                  {content.photo.fileHint}
                </span>
              </button>
            </>
          )}
          <input ref={inputRef} type='file' accept={AVATAR_ACCEPT} className='sr-only' tabIndex={-1} onChange={handleInputChange} />

          {fileError ? (
            <p role='alert' className='text-destructive text-sm'>
              {fileError}
            </p>
          ) : null}
        </div>

        <DialogFooter className='sm:justify-between'>
          {profile.avatarUrl && !selection ? (
            <Button type='button' variant='ghost' className='text-destructive' disabled={isBusy} onClick={handleRemoveClick}>
              <Trash2Icon data-icon='inline-start' />
              {removeAvatar.isPending ? content.photo.removingButton : content.photo.removeButton}
            </Button>
          ) : (
            <span />
          )}
          <div className='flex flex-col-reverse gap-2 sm:flex-row'>
            <DialogClose render={<Button type='button' variant='outline' disabled={isBusy} />}>{content.photo.cancelButton}</DialogClose>
            <Button type='button' disabled={!selection || isBusy} onClick={handleSaveClick}>
              {isPreparing || uploadAvatar.isPending ? content.photo.savingButton : content.photo.saveButton}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ChangePhotoDialogProps {
  profile: UserProfile;
}

interface PhotoSelection {
  file: File;
  previewUrl: string;
}
