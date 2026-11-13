import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function StatCard({ label, value, hint, icon: Icon, isHighlighted = false, footer, className }: StatCardProps) {
  return (
    <div
      data-highlighted={isHighlighted}
      className={cn(
        'group/stat bg-card relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5',
        'data-[highlighted=true]:bg-brand-black data-[highlighted=true]:text-brand-white data-[highlighted=true]:border-transparent',
        className
      )}
    >
      {isHighlighted ? <div aria-hidden className='bg-glow pointer-events-none absolute inset-0 opacity-90' /> : null}
      <div className='relative flex items-center justify-between gap-2'>
        <span className='text-sm font-medium opacity-70'>{label}</span>
        {Icon ? (
          <span className='bg-muted text-foreground group-data-[highlighted=true]/stat:bg-electric-green group-data-[highlighted=true]/stat:text-brand-black flex size-8 items-center justify-center rounded-xl'>
            <Icon className='size-4' />
          </span>
        ) : null}
      </div>
      <div className='relative flex flex-col gap-1'>
        <span className='text-28 leading-none font-semibold tracking-tight tabular-nums'>{value}</span>
        {hint ? <span className='text-xs opacity-70'>{hint}</span> : null}
      </div>
      {footer ? <div className='relative'>{footer}</div> : null}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  isHighlighted?: boolean;
  footer?: ReactNode;
  className?: string;
}
