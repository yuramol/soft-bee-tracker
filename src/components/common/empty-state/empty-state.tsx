import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in bg-grid flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center duration-500',
        className
      )}
    >
      {Icon ? (
        <div className='bg-electric-green/20 text-foreground ring-electric-green/40 flex size-12 items-center justify-center rounded-2xl ring-1'>
          <Icon className='size-6' />
        </div>
      ) : null}
      <div className='flex max-w-sm flex-col gap-1'>
        <p className='text-base font-medium'>{title}</p>
        {description ? <p className='text-muted-foreground text-sm'>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}
