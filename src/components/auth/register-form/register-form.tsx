'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { ROUTES } from '@/constants';
import { useSignUp } from '@/lib/api/auth';
import { registerFormSchema, type RegisterFormValues } from '@/lib/schemas/register-form.schema';

export function RegisterForm() {
  const router = useRouter();
  const signUp = useSignUp({
    onSuccess: () => {
      router.push(ROUTES.LOGIN);
    }
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<RegisterFormValues>({
    defaultValues: {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      linkedin: '',
      upwork: '',
      password: '',
      confirmPassword: ''
    },
    resolver: zodResolver(registerFormSchema)
  });

  function handleRegisterSubmit(values: RegisterFormValues) {
    signUp.mutate(values);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(handleRegisterSubmit)(event);
  }

  const isBusy = isSubmitting || signUp.isPending;

  return (
    <form className='grid gap-5 sm:grid-cols-2' onSubmit={handleFormSubmit} noValidate>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='firstName'>First name</Label>
        <Input
          id='firstName'
          autoComplete='given-name'
          placeholder='John'
          aria-invalid={Boolean(errors.firstName)}
          {...register('firstName')}
        />
        {errors.firstName ? <p className='text-destructive text-sm'>{errors.firstName.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='lastName'>Last name</Label>
        <Input
          id='lastName'
          autoComplete='family-name'
          placeholder='Doe'
          aria-invalid={Boolean(errors.lastName)}
          {...register('lastName')}
        />
        {errors.lastName ? <p className='text-destructive text-sm'>{errors.lastName.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2 sm:col-span-2'>
        <Label htmlFor='username'>Username</Label>
        <Input
          id='username'
          autoComplete='username'
          placeholder='johndoe'
          aria-invalid={Boolean(errors.username)}
          {...register('username')}
        />
        {errors.username ? <p className='text-destructive text-sm'>{errors.username.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2 sm:col-span-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          type='email'
          autoComplete='email'
          placeholder='you@example.com'
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email ? <p className='text-destructive text-sm'>{errors.email.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2 sm:col-span-2'>
        <Label htmlFor='phone'>Phone (optional)</Label>
        <Input
          id='phone'
          type='tel'
          autoComplete='tel'
          placeholder='+380501234567'
          aria-invalid={Boolean(errors.phone)}
          {...register('phone')}
        />
        {errors.phone ? <p className='text-destructive text-sm'>{errors.phone.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='linkedin'>LinkedIn URL (optional)</Label>
        <Input
          id='linkedin'
          type='url'
          placeholder='https://linkedin.com/in/you'
          aria-invalid={Boolean(errors.linkedin)}
          {...register('linkedin')}
        />
        {errors.linkedin ? <p className='text-destructive text-sm'>{errors.linkedin.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='upwork'>Upwork URL (optional)</Label>
        <Input
          id='upwork'
          type='url'
          placeholder='https://upwork.com/freelancers/you'
          aria-invalid={Boolean(errors.upwork)}
          {...register('upwork')}
        />
        {errors.upwork ? <p className='text-destructive text-sm'>{errors.upwork.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          type='password'
          autoComplete='new-password'
          placeholder='••••••••'
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? <p className='text-destructive text-sm'>{errors.password.message}</p> : null}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='confirmPassword'>Confirm password</Label>
        <Input
          id='confirmPassword'
          type='password'
          autoComplete='new-password'
          placeholder='••••••••'
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? <p className='text-destructive text-sm'>{errors.confirmPassword.message}</p> : null}
      </div>

      <Button className='w-full sm:col-span-2' disabled={isBusy} type='submit'>
        Create account
      </Button>

      <p className='text-muted-foreground text-center text-sm sm:col-span-2'>
        Already have an account?{' '}
        <Link className='text-foreground font-medium hover:underline' href={ROUTES.LOGIN}>
          Log In
        </Link>
      </p>
    </form>
  );
}
