'use client';

import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';

import { Button } from '@ui/button';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/types/api-error';
import content from '../content.json';

export function ErrorState({ error, title = content.errorState.title, onRetry, className }: ErrorStateProps) {
  function handleRetryClick() {
    onRetry?.();
  }

  return (
    <div
      role='alert'
      className={cn(
        'animate-in fade-in border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-4 rounded-2xl border px-6 py-10 text-center duration-500',
        className
      )}
    >
      <div className='bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl'>
        <TriangleAlertIcon className='size-6' />
      </div>
      <div className='flex max-w-sm flex-col gap-1'>
        <p className='text-base font-medium'>{title}</p>
        <p className='text-muted-foreground text-sm'>{error.message}</p>
      </div>
      {onRetry ? (
        <Button variant='outline' onClick={handleRetryClick}>
          <RotateCcwIcon data-icon='inline-start' />
          {content.errorState.retryButton}
        </Button>
      ) : null}
    </div>
  );
}

interface ErrorStateProps {
  error: ApiError;
  title?: string;
  onRetry?: () => void;
  className?: string;
}
