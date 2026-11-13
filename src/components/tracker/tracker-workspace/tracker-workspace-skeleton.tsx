import type { ReactNode } from 'react';

import { PageHeaderSkeleton, SkeletonRegion } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';
import { cn } from '@/lib/utils';

export function TrackerWorkspaceSkeleton({ header }: TrackerWorkspaceSkeletonProps) {
  return (
    <SkeletonRegion className={TRACKER_GRID_CLASS}>
      <div className='flex min-w-0 flex-col gap-6'>
        {header ?? <PageHeaderSkeleton />}
        <div className='flex flex-col gap-5 py-2'>
          <DayNavigatorSkeleton />
          <WeekStripSkeleton />
          <div className='flex flex-col gap-4 border-t pt-5'>
            <div className='flex min-h-9 items-center justify-between gap-3'>
              <Skeleton className='h-5 w-36' />
              <Skeleton className='h-9 w-28 rounded-full' />
            </div>
            <TrackerEntriesSkeleton />
          </div>
          <div className='flex items-baseline justify-between gap-3 border-t pt-4'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-7 w-16' />
          </div>
        </div>
      </div>

      <div className='grid items-start gap-6 sm:grid-cols-2 lg:flex lg:flex-col lg:items-stretch'>
        <LeavePanelSkeleton className='sm:col-span-2' />
        <SummarySkeleton />
        <CalendarSkeleton />
      </div>
    </SkeletonRegion>
  );
}

export function TrackerEntriesSkeleton({ rows = 2 }: TrackerEntriesSkeletonProps) {
  return (
    <div className='flex flex-col gap-3'>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className='flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-4 sm:flex-nowrap sm:px-5'>
          <div className='flex min-w-0 flex-1 flex-col gap-2'>
            <Skeleton className='h-4 w-2/5' />
            <Skeleton className='h-3.5 w-3/5' />
          </div>
          <Skeleton className='h-7 w-16' />
          <div className='flex shrink-0 items-center gap-1 max-sm:w-full max-sm:justify-end'>
            <Skeleton className='size-9 rounded-lg' />
            <Skeleton className='size-9 rounded-lg' />
            <Skeleton className='ml-1 h-9 w-20 rounded-lg' />
          </div>
        </div>
      ))}
    </div>
  );
}

function DayNavigatorSkeleton() {
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <div className='flex items-center gap-2'>
        <Skeleton className='size-9 rounded-lg' />
        <Skeleton className='size-9 rounded-lg' />
      </div>
      <Skeleton className='h-7 w-40 sm:h-8' />
      <Skeleton className='h-4 w-12' />
    </div>
  );
}

function WeekStripSkeleton() {
  return (
    <div className='-mx-1 overflow-hidden px-1'>
      <div className='grid min-w-[30rem] grid-cols-7 gap-1.5'>
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className='flex flex-col items-center gap-1 rounded-xl px-1 py-3'>
            <Skeleton className='h-3.5 w-8' />
            <Skeleton className='h-5 w-10' />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeavePanelSkeleton({ className }: LeavePanelSkeletonProps) {
  return (
    <div className={cn(PANEL_CLASS, className)}>
      <Skeleton className='h-11 w-full rounded-full' />
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className='flex items-start justify-between gap-3'>
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-3 w-24' />
          </div>
          <Skeleton className='h-5 w-14' />
        </div>
      ))}
      <Skeleton className='h-3 w-3/4' />
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className={PANEL_CLASS}>
      <Skeleton className='h-11 w-full rounded-full' />
      <Skeleton className='h-4 w-32' />
      <div className='flex flex-col gap-3'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-4/5' />
      </div>
      <div className='flex items-baseline justify-between gap-3 border-t pt-4'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-7 w-16' />
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className={PANEL_CLASS}>
      <div className='flex items-center justify-between gap-2'>
        <Skeleton className='h-5 w-32' />
        <div className='flex gap-1'>
          <Skeleton className='size-7 rounded-lg' />
          <Skeleton className='size-7 rounded-lg' />
        </div>
      </div>
      <div className='grid grid-cols-7 gap-1'>
        {Array.from({ length: 42 }, (_, index) => (
          <Skeleton key={index} className={index < 7 ? 'mx-auto my-1 h-3 w-5' : 'aspect-square rounded-lg'} />
        ))}
      </div>
      <div className='flex flex-wrap gap-x-4 gap-y-2 border-t pt-3'>
        <Skeleton className='h-3 w-32' />
        <Skeleton className='h-3 w-28' />
        <Skeleton className='h-3 w-16' />
      </div>
    </div>
  );
}

export const TRACKER_GRID_CLASS =
  'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-12 xl:grid-cols-[minmax(0,1fr)_24rem]';

const PANEL_CLASS = 'flex flex-col gap-4 rounded-2xl border p-4 sm:p-5';

interface TrackerWorkspaceSkeletonProps {
  header?: ReactNode;
}

interface TrackerEntriesSkeletonProps {
  rows?: number;
}

interface LeavePanelSkeletonProps {
  className?: string;
}
