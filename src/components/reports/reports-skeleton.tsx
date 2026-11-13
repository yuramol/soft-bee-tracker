import { FieldSkeleton, PageHeaderSkeleton, SkeletonRegion, TableSkeleton } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function ReportsPageSkeleton() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton />
      <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <ReportResultsSkeleton />
        <div className='order-first flex flex-col gap-5 lg:order-none'>
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-10 w-full rounded-lg' />
          <div className='grid grid-cols-2 gap-3'>
            <Skeleton className='h-9 rounded-lg' />
            <Skeleton className='h-9 rounded-lg' />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function ReportResultsSkeleton() {
  return (
    <div className='flex min-w-0 flex-col gap-5'>
      <div className='flex items-center justify-between gap-4'>
        <Skeleton className='h-7 w-36' />
        <Skeleton className='h-7 w-44' />
      </div>
      <TableSkeleton rows={4} columns={4} />
    </div>
  );
}
