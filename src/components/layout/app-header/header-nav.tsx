'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getNavItems, isNavItemActive } from '@components/layout/navigation';
import type { UserRole } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

interface HeaderNavProps {
  role: UserRole;
  className?: string;
  orientation?: NavOrientation;
  onNavigate?: () => void;
}

export function HeaderNav({ role, className, orientation = 'horizontal', onNavigate }: HeaderNavProps) {
  const pathname = usePathname();
  const isVertical = orientation === 'vertical';

  return (
    <nav className={className}>
      <ul className={cn('flex gap-1', isVertical && 'flex-col')}>
        {getNavItems(role).map((item) => {
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive || undefined}
                className={cn(
                  'text-muted-foreground flex items-center gap-2 rounded-md px-3 text-sm transition-colors',
                  'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
                  'hover:text-deep-teal dark:hover:text-electric-green',
                  'data-active:text-deep-teal dark:data-active:text-electric-green data-active:font-medium',
                  isVertical ? 'h-10' : 'h-9'
                )}
                onClick={onNavigate}
              >
                <item.icon className='size-4 shrink-0' />
                {/* Invisible bold copy reserves the active width so the nav doesn't shift */}
                <span
                  data-text={item.title}
                  className='flex flex-col after:invisible after:h-0 after:overflow-hidden after:font-medium after:content-[attr(data-text)]'
                >
                  {item.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type NavOrientation = 'horizontal' | 'vertical';
