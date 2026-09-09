'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@ui/field';
import { Input } from '@ui/input';
import { PROFILE_FORM_FIELDS } from '@components/profile/profile-form/profile-form.constants';
import { useProfileStore } from '@/lib/api/auth';
import type { UpdateProfileRequest, UserProfile } from '@/lib/api/auth';
import { profileFormSchema, type ProfileFormValues } from '@/lib/schemas/profile-form.schema';
import { getUserAvatarFallback } from '@/lib/utils';

interface ProfileFormProps {
  profile: UserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const {
    formState: { errors, isDirty, isSubmitting },
    control,
    handleSubmit,
    register,
    reset
  } = useForm<ProfileFormValues>({
    defaultValues: buildProfileFormValues(profile),
    resolver: zodResolver(profileFormSchema)
  });

  const router = useRouter();
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const isSaving = useProfileStore((state) => state.isSaving);
  const saveError = useProfileStore((state) => state.saveError);

  // the page resolves the profile on the server; hand it to the store so the store
  // stays the single client-side owner, and re-seed whenever the server sends a new row
  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  async function handleProfileSubmit(values: ProfileFormValues) {
    try {
      await updateProfile(buildUpdateProfileRequest(values));
      // the saved values become the new baseline, which clears isDirty
      reset(values);
      // pulls the server-rendered profile (sidebar avatar, header) back in sync
      router.refresh();
    } catch {
      // the store owns the failure; it is rendered from `saveError` below
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleProfileSubmit)(event);
  }

  function handleCancelClick() {
    reset();
  }

  // useWatch (not watch) keeps the component eligible for React Compiler memoization
  const avatarUrl = useWatch({ control, name: 'avatarUrl' }).trim();
  const isBusy = isSubmitting || isSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update the details other people in the workspace see.</CardDescription>
        {avatarUrl ? (
          <CardAction>
            <Avatar className='size-12'>
              {/* a typo in the URL falls through to the initials rather than a broken image */}
              <AvatarImage src={avatarUrl} alt={`${profile.firstName} ${profile.lastName}`.trim()} />
              <AvatarFallback>{getUserAvatarFallback(profile)}</AvatarFallback>
            </Avatar>
          </CardAction>
        ) : null}
      </CardHeader>

      <form onSubmit={handleFormSubmit} noValidate>
        <CardContent>
          <FieldGroup className='grid gap-5 sm:grid-cols-2'>
            {PROFILE_FORM_FIELDS.map((field) => (
              <Field key={field.name} data-invalid={Boolean(errors[field.name])}>
                <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
                <Input
                  id={field.name}
                  type={field.type ?? 'text'}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  disabled={isBusy}
                  aria-invalid={Boolean(errors[field.name])}
                  {...register(field.name)}
                />
                {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
                <FieldError errors={[errors[field.name]]} />
              </Field>
            ))}

            <Field className='sm:col-span-2'>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input id='email' type='email' value={profile.email} disabled readOnly />
              <FieldDescription>Your Email is tied to your sign-in and cannot be changed here.</FieldDescription>
            </Field>

            <Field className='sm:col-span-2'>
              <FieldLabel htmlFor='role'>Role</FieldLabel>
              <Input id='role' type='role' value={profile.role} disabled readOnly />
              <FieldDescription>Your Role cannot be changed here.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className='justify-end gap-2'>
          {saveError ? (
            <p role='alert' className='text-destructive mr-auto text-sm'>
              {saveError.message}
            </p>
          ) : null}
          <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button type='submit' disabled={!isDirty || isBusy}>
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function buildProfileFormValues(profile: UserProfile): ProfileFormValues {
  // the form works in empty strings so untouched optional inputs stay pristine
  return {
    username: profile.username,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    linkedin: profile.linkedin ?? '',
    upwork: profile.upwork ?? ''
  };
}

function buildUpdateProfileRequest(values: ProfileFormValues): UpdateProfileRequest {
  // empty optional inputs go back to the column default of null, not ''
  return {
    username: values.username.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim() || null,
    avatarUrl: values.avatarUrl.trim() || null,
    linkedin: values.linkedin.trim() || null,
    upwork: values.upwork.trim() || null
  };
}
