'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormField } from '@components/common/form/form-field';
import { RoleBadge } from '@components/crew/role-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ui/card';
import { FieldGroup } from '@ui/field';
import { Input } from '@ui/input';
import { PROFILE_FORM_FIELDS } from '@components/profile/profile-form/profile-form.constants';
import { useProfileStore } from '@/lib/api/auth';
import type { UpdateProfileRequest, UserProfile } from '@/lib/api/auth';
import { profileFormSchema, type ProfileFormValues } from '@/lib/schemas/profile-form.schema';
import { getUserAvatarFallback } from '@/lib/utils';
import content from './content.json';

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
    <div className='flex flex-col gap-6'>
      <section className='bg-brand-black text-brand-white relative overflow-hidden rounded-2xl p-6 sm:p-8'>
        <div aria-hidden className='bg-glow absolute inset-0' />
        <div className='relative flex flex-col gap-5 sm:flex-row sm:items-center'>
          <Avatar className='ring-electric-green/60 size-20 ring-4'>
            {/* a typo in the URL falls through to the initials rather than a broken image */}
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={`${profile.firstName} ${profile.lastName}`.trim()} /> : null}
            <AvatarFallback className='bg-electric-green text-brand-black text-xl font-semibold'>
              {getUserAvatarFallback(profile)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-24 font-semibold tracking-tight'>
                {`${profile.firstName} ${profile.lastName}`.trim() || profile.username}
              </h2>
              <RoleBadge role={profile.role} />
            </div>
            <p className='text-brand-white/70 text-sm'>
              @{profile.username} · {profile.email}
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className='border-b'>
          <CardTitle>{content.detailsTitle}</CardTitle>
          <CardDescription>{content.detailsDescription}</CardDescription>
        </CardHeader>

        <form onSubmit={handleFormSubmit} noValidate>
          <CardContent>
            <FieldGroup className='grid gap-5 sm:grid-cols-2'>
              {PROFILE_FORM_FIELDS.map((field) => (
                <FormField
                  key={field.name}
                  label={field.label}
                  htmlFor={field.name}
                  error={errors[field.name]}
                  description={field.description}
                >
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

              <FormField className='mb-5 sm:col-span-2' label={content.emailLabel} htmlFor='email' description={content.emailDescription}>
                <Input id='email' type='email' value={profile.email} disabled readOnly />
              </FormField>
            </FieldGroup>
          </CardContent>

          <CardFooter className='justify-end gap-2'>
            {saveError ? (
              <p role='alert' className='text-destructive mr-auto text-sm'>
                {saveError.message}
              </p>
            ) : null}
            <Button type='button' variant='outline' disabled={isBusy} onClick={handleCancelClick}>
              {content.cancelButton}
            </Button>
            <Button type='submit' disabled={!isDirty || isBusy}>
              {isBusy ? content.savingButton : content.saveButton}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
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
