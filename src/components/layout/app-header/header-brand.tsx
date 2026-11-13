import Link from 'next/link';

import { LogoMark } from '@/assets/icons/logo-mark';
import { ROUTES } from '@/constants';
import content from '../content.json';

interface HeaderBrandProps {
  onNavigate?: () => void;
}

export function HeaderBrand({ onNavigate }: HeaderBrandProps) {
  return (
    <Link href={ROUTES.TRACKER} aria-label={content.brand.appName} className='flex min-w-0 items-center gap-2' onClick={onNavigate}>
      <div className='bg-electric-green text-brand-black shadow-glow flex aspect-square size-8 shrink-0 items-center justify-center rounded-full'>
        <LogoMark className='h-4.5 w-auto' />
      </div>
      <div className='grid leading-tight'>
        <span className='truncate text-sm font-semibold tracking-tight'>{content.brand.brandName}</span>
        <span className='text-muted-foreground truncate text-xs'>{content.brand.brandSuffix}</span>
      </div>
    </Link>
  );
}
