import { FieldSkeleton, PageHeaderSkeleton, SkeletonRegion, TabsSkeleton } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function CrewPageSkeleton() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton hasAction />
      <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-12 xl:grid-cols-[minmax(0,1fr)_24rem]'>
        <div className='flex min-w-0 flex-col gap-5'>
          <TabsSkeleton />
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]'>
            <FieldSkeleton className='sm:col-span-2 xl:col-span-1' />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <Skeleton className='h-4 w-20' />
          <div className='flex flex-col gap-3'>
            {Array.from({ length: 5 }, (_, index) => (
              <MemberCardSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className='flex flex-col gap-4 rounded-2xl border p-4 max-lg:order-first sm:p-5'>
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-5 w-36' />
            <Skeleton className='h-4 w-44' />
          </div>
          <div className='flex items-baseline justify-between gap-3 border-t pt-4'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-20' />
          </div>
          <div className='flex flex-col gap-3'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
            <Skeleton className='h-4 w-3/5' />
          </div>
          <Skeleton className='mt-2 h-9 w-full rounded-lg' />
        </div>
      </div>
    </SkeletonRegion>
  );
}

function MemberCardSkeleton() {
  return (
    <div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-4 sm:px-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-4'>
      <div className='flex min-w-0 items-center gap-3'>
        <Skeleton className='size-10 shrink-0 rounded-full' />
        <div className='flex flex-1 flex-col gap-2'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-3.5 w-40' />
        </div>
      </div>
      <Skeleton className='size-9 rounded-lg lg:col-start-4' />
      <div className='col-span-2 flex flex-col gap-2 border-t pt-3 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:border-t-0 lg:pt-0'>
        <Skeleton className='h-4 w-36' />
        <Skeleton className='h-3 w-28' />
      </div>
      <div className='col-span-2 flex items-center justify-between gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1'>
        <Skeleton className='h-5 w-14 rounded-full' />
        <Skeleton className='h-9 w-16 rounded-lg' />
      </div>
    </div>
  );
}
