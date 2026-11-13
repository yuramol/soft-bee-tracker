'use client';

import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { cn } from '@/lib/utils';
import content from '../content.json';

export function PasswordInput({ className, ...props }: ComponentProps<'input'>) {
  const [isVisible, setIsVisible] = useState(false);

  function handleVisibilityToggle() {
    setIsVisible((current) => !current);
  }

  return (
    <div className='relative'>
      <LockIcon aria-hidden className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
      <Input type={isVisible ? 'text' : 'password'} className={cn('px-9', className)} {...props} />
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        className='text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2'
        aria-label={isVisible ? content.passwordInput.hide : content.passwordInput.show}
        onClick={handleVisibilityToggle}
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  );
}
