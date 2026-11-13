'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ConfirmDialog } from '@components/common/confirm-dialog/confirm-dialog';
import { FormField } from '@components/common/form/form-field';
import { ChangeEmailDialog } from '@components/profile/change-email-dialog/change-email-dialog';
import { PROFILE_FORM_FIELDS } from '@components/profile/profile-form/profile-form.constants';
import { TimeZoneCombobox } from '@components/profile/time-zone-combobox/time-zone-combobox';
import { Button } from '@ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ui/card';
import { FieldGroup } from '@ui/field';
import { Input } from '@ui/input';
import { usePendingEmailChange, useUpdateProfile } from '@/lib/api/auth';
import type { UpdateProfileRequest, UserProfile } from '@/lib/api/auth';
import { formatText } from '@/lib/format-text';
import { getProfilePosition } from '@/lib/profile';
import { profileFormSchema, type ProfileFormValues } from '@/lib/schemas/profile-form.schema';
import { COMPANY_TIME_ZONE, COMPANY_TIME_ZONE_LABEL } from '@/lib/work-time-policy';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const { data: pendingEmail } = usePendingEmailChange();
  const deviceTimeZone = useSyncExternalStore(subscribeToNothing, getBrowserTimeZone, getServerTimeZone);
  const {
    formState: { errors, isDirty },
    control,
    handleSubmit,
    register,
    reset
  } = useForm<ProfileFormValues>({
    defaultValues: buildProfileFormValues(profile),
    resolver: zodResolver(profileFormSchema)
  });
  const { field: timeZoneField } = useController({ control, name: 'timeZone' });
  const isUsingCompanyDefault = !profile.timeZone && timeZoneField.value === COMPANY_TIME_ZONE;
  const { isLeavePending, confirmLeave, cancelLeave } = useUnsavedChangesGuard(isDirty);

  const isBusy = updateProfile.isPending;
  const position = getProfilePosition(profile);

  function handleProfileSubmit(values: ProfileFormValues) {
    function handleSaved(savedProfile: UserProfile) {
      // the saved row becomes the new baseline, which clears isDirty
      reset(buildProfileFormValues(savedProfile));
      toast.success(content.form.saved);
      // the header avatar menu is server-rendered from the same row
      router.refresh();
    }

    function handleFailed(error: ApiError) {
      toast.error(error.message);
    }

    updateProfile.mutate(buildUpdateProfileRequest(values), { onSuccess: handleSaved, onError: handleFailed });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleProfileSubmit)(event);
  }

  function handleUseDeviceTimeZoneClick() {
    if (deviceTimeZone) {
      timeZoneField.onChange(deviceTimeZone);
    }
  }

  function handleDiscardClick() {
    reset();
  }

  function handleLeaveDialogOpenChange(open: boolean) {
    if (!open) {
      cancelLeave();
    }
  }

  return (
    <Card>
      <CardHeader className='border-b'>
        <CardTitle>{content.form.title}</CardTitle>
        <CardDescription>{content.form.description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} noValidate>
        <CardContent className='pb-6'>
          <FieldGroup className='grid gap-5 sm:grid-cols-2'>
            {PROFILE_FORM_FIELDS.map((field) => (
              <FormField key={field.name} label={field.label} htmlFor={field.name} error={errors[field.name]}>
                <Input
                  id={field.name}
                  type={field.type ?? 'text'}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  disabled={isBusy}
                  aria-invalid={Boolean(errors[field.name])}
                  {...register(field.name)}
                />
              </FormField>
            ))}

            <FormField
              label={content.form.emailLabel}
              htmlFor='email'
              description={pendingEmail ? formatText(content.form.emailPending, { email: pendingEmail }) : content.form.emailDescription}
            >
              <div className='relative'>
                <Input id='email' type='email' value={profile.email} readOnly disabled className='pr-10' />
                <ChangeEmailDialog currentEmail={profile.email} />
              </div>
            </FormField>

            <FormField label={content.form.positionLabel} htmlFor='position'>
              <Input id='position' value={position ?? '—'} readOnly disabled />
            </FormField>

            <FormField
              label={content.form.timeZoneLabel}
              htmlFor='timeZone'
              error={errors.timeZone}
              description={
                isUsingCompanyDefault ? formatText(content.form.timeZoneCompanyDefault, { timeZone: COMPANY_TIME_ZONE_LABEL }) : undefined
              }
            >
              <TimeZoneCombobox
                id='timeZone'
                value={timeZoneField.value}
                detectedTimeZone={deviceTimeZone}
                isDisabled={isBusy}
                isInvalid={Boolean(errors.timeZone)}
                onChange={timeZoneField.onChange}
              />
              {deviceTimeZone && timeZoneField.value !== deviceTimeZone ? (
                <Button
                  type='button'
                  variant='link'
                  size='sm'
                  disabled={isBusy}
                  className='h-auto self-start p-0 text-xs'
                  onClick={handleUseDeviceTimeZoneClick}
                >
                  {formatText(content.form.timeZoneUseDevice, { timeZone: deviceTimeZone.replaceAll('_', ' ') })}
                </Button>
              ) : null}
            </FormField>
          </FieldGroup>
        </CardContent>

        <CardFooter className='flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end'>
          {isDirty ? (
            <p role='status' className='text-muted-foreground text-sm sm:mr-auto'>
              {content.form.unsavedHint}
            </p>
          ) : null}
          <Button type='button' variant='outline' disabled={!isDirty || isBusy} onClick={handleDiscardClick}>
            {content.form.discardButton}
          </Button>
          <Button type='submit' disabled={!isDirty || isBusy}>
            {isBusy ? content.form.savingButton : content.form.saveButton}
          </Button>
        </CardFooter>
      </form>

      <ConfirmDialog
        open={isLeavePending}
        onOpenChange={handleLeaveDialogOpenChange}
        title={content.leaveDialog.title}
        description={content.leaveDialog.description}
        confirmLabel={content.leaveDialog.confirmButton}
        isDestructive
        onConfirm={confirmLeave}
      />
    </Card>
  );
}

function buildProfileFormValues(profile: UserProfile): ProfileFormValues {
  // the form works in empty strings so untouched optional inputs stay pristine;
  // a profile without a saved zone starts on the company zone (UTC+2)
  return {
    username: profile.username,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone ?? '',
    linkedin: profile.linkedin ?? '',
    upwork: profile.upwork ?? '',
    timeZone: profile.timeZone ?? COMPANY_TIME_ZONE
  };
}

function buildUpdateProfileRequest(values: ProfileFormValues): UpdateProfileRequest {
  // empty optional inputs go back to the column default of null, not ''
  return {
    username: values.username.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim() || null,
    linkedin: values.linkedin.trim() || null,
    upwork: values.upwork.trim() || null,
    timeZone: values.timeZone || null
  };
}

function subscribeToNothing() {
  return () => {};
}

function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getServerTimeZone(): null {
  return null;
}

interface ProfileFormProps {
  profile: UserProfile;
}
