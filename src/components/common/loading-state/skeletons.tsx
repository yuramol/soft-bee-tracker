import type { ReactNode } from 'react';

import { Skeleton } from '@ui/skeleton';
import { cn } from '@/lib/utils';
import content from '../content.json';

export function SkeletonRegion({ children, className }: SkeletonRegionProps) {
  return (
    <div role='status' aria-busy='true' aria-label={content.loading.label} className={className}>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ hasEyebrow = false, hasDescription = false, hasAction = false }: PageHeaderSkeletonProps) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
      <div className='flex flex-col gap-2.5'>
        {hasEyebrow ? <Skeleton className='h-3 w-20' /> : null}
        <Skeleton className='h-10 w-44' />
        {hasDescription ? <Skeleton className='h-4 w-full max-w-md' /> : null}
      </div>
      {hasAction ? <Skeleton className='h-11 w-40 rounded-full' /> : null}
    </div>
  );
}

export function TabsSkeleton({ tabs = 2, className }: TabsSkeletonProps) {
  return (
    <div className={cn('bg-muted flex h-11 w-fit gap-1 rounded-full p-1', className)}>
      {Array.from({ length: tabs }, (_, index) => (
        <Skeleton key={index} className='bg-background/70 h-full w-24 flex-1 rounded-full' />
      ))}
    </div>
  );
}

export function FieldSkeleton({ className }: FieldSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Skeleton className='h-3.5 w-16' />
      <Skeleton className='h-12 w-full rounded-lg' />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <SkeletonRegion className={cn('overflow-hidden rounded-2xl border', className)}>
      <div className='bg-muted/50 grid gap-4 border-b px-4 py-3' style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, columnIndex) => (
          <Skeleton key={columnIndex} className='h-3.5 w-2/3' />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className='grid items-center gap-4 border-b px-4 py-4 last:border-b-0'
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton key={columnIndex} className={cn('h-4', columnIndex === 0 ? 'w-4/5' : 'w-1/2')} />
          ))}
        </div>
      ))}
    </SkeletonRegion>
  );
}

interface SkeletonRegionProps {
  children: ReactNode;
  className?: string;
}

interface PageHeaderSkeletonProps {
  hasEyebrow?: boolean;
  hasDescription?: boolean;
  hasAction?: boolean;
}

interface TabsSkeletonProps {
  tabs?: number;
  className?: string;
}

interface FieldSkeletonProps {
  className?: string;
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}
