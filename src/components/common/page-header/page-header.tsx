import type { ReactNode } from 'react';

import { Typography } from '@ui/typography';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-500 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className='flex flex-col gap-1.5'>
        {eyebrow ? <span className='text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase'>{eyebrow}</span> : null}
        <Typography variant='h3' tag='h1' className='font-semibold tracking-tight'>
          {title}
        </Typography>
        {description ? <p className='text-muted-foreground max-w-2xl text-sm'>{description}</p> : null}
      </div>
      {actions ? <div className='flex flex-wrap items-center gap-2'>{actions}</div> : null}
    </header>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}
