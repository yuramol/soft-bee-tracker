'use client';

import { useState } from 'react';
import { MenuIcon, XIcon } from 'lucide-react';

import { Button } from '@ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@ui/sheet';
import { HeaderBrand } from '@components/layout/app-header/header-brand';
import { HeaderNav } from '@components/layout/app-header/header-nav';
import type { UserRole } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import content from '../content.json';

export function MobileNav({ role }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleNavigate() {
    setIsOpen(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger render={<Button variant='ghost' size='icon' className='md:hidden' aria-label={content.header.openMenu} />}>
        <MenuIcon />
      </SheetTrigger>
      <SheetContent
        side='right'
        showCloseButton={false}
        className={cn(
          'gap-2 border-b pb-6',
          'data-[side=right]:bottom-auto data-[side=right]:h-auto data-[side=right]:w-full data-[side=right]:sm:max-w-none',
          'duration-300 data-ending-style:opacity-100 data-starting-style:opacity-100',
          'data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full'
        )}
        overlayClassName='bg-background/30 backdrop-blur-[3px] supports-backdrop-filter:backdrop-blur-[3px]'
      >
        <SheetHeader className='h-14 flex-row items-center justify-between gap-4 px-4 py-0 sm:px-6'>
          <SheetTitle className='sr-only'>{content.header.menuTitle}</SheetTitle>
          <SheetDescription className='sr-only'>{content.brand.appName}</SheetDescription>
          <HeaderBrand onNavigate={handleNavigate} />
          <SheetClose render={<Button variant='ghost' size='icon' aria-label={content.header.closeMenu} />}>
            <XIcon />
          </SheetClose>
        </SheetHeader>
        <HeaderNav role={role} orientation='vertical' className='px-2' onNavigate={handleNavigate} />
      </SheetContent>
    </Sheet>
  );
}

interface MobileNavProps {
  role: UserRole | null;
}
