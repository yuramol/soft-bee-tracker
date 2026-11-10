import { PageHeaderSkeleton, SkeletonRegion, TableSkeleton } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function ReportsPageSkeleton() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton hasEyebrow hasDescription />
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center'>
          <Skeleton className='h-12 w-full rounded-lg sm:w-44' />
          <Skeleton className='h-12 w-full rounded-lg sm:w-48' />
          <div className='flex gap-2 sm:ml-auto'>
            <Skeleton className='h-9 w-20 rounded-lg' />
            <Skeleton className='h-9 w-20 rounded-lg' />
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className='flex flex-col gap-3 rounded-2xl border p-5'>
              <div className='flex items-center justify-between gap-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='size-8 rounded-xl' />
              </div>
              <div className='flex flex-col gap-2'>
                <Skeleton className='h-7 w-20' />
                <Skeleton className='h-3 w-28' />
              </div>
            </div>
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
          <div className='flex flex-col gap-5 rounded-2xl border p-5'>
            <Skeleton className='h-5 w-28' />
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className='flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-4 w-12' />
                </div>
                <Skeleton className='h-2 w-full rounded-full' />
              </div>
            ))}
          </div>
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
