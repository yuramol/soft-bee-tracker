import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Typography } from '@ui/typography';

export function SystemState({ code, icon: Icon, title, description, actions }: SystemStateProps) {
  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 relative flex flex-col items-center gap-6 px-4 py-16 text-center duration-500'>
      <div aria-hidden className='bg-glow absolute inset-0 -z-10 rounded-full blur-2xl' />
      <div className='bg-brand-black text-electric-green shadow-glow flex size-16 items-center justify-center rounded-2xl'>
        <Icon className='size-7' />
      </div>
      {code ? <span className='text-muted-foreground text-sm font-medium tracking-[0.3em]'>{code}</span> : null}
      <div className='flex max-w-md flex-col gap-2'>
        <Typography variant='h3' tag='h1' className='font-semibold tracking-tight'>
          {title}
        </Typography>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>
      {actions ? <div className='flex flex-wrap justify-center gap-2'>{actions}</div> : null}
    </div>
  );
}

interface SystemStateProps {
  code?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}
