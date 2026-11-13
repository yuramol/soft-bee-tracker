import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Input } from '@ui/input';
import { cn } from '@/lib/utils';

export function IconInput({ icon: Icon, className, ...props }: IconInputProps) {
  return (
    <div className='relative'>
      <Icon aria-hidden className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  );
}

interface IconInputProps extends ComponentProps<'input'> {
  icon: LucideIcon;
}
