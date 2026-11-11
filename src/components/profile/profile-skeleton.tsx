import { FieldSkeleton, PageHeaderSkeleton, SkeletonRegion } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function ProfilePageSkeleton() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton hasEyebrow hasDescription />
      <div className='grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)]'>
        <div className='flex flex-col items-center gap-4 rounded-2xl border p-5 sm:p-6'>
          <Skeleton className='size-24 rounded-full sm:size-28' />
          <Skeleton className='h-7 w-32 rounded-lg' />
          <Skeleton className='h-6 w-40' />
          <div className='flex gap-2'>
            <Skeleton className='h-5 w-14 rounded-full' />
            <Skeleton className='h-5 w-14 rounded-full' />
          </div>
          <div className='flex w-full flex-col gap-4 border-t pt-5'>
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
          </div>
        </div>

        <div className='flex flex-col gap-8'>
          <div className='overflow-hidden rounded-xl border'>
            <div className='flex flex-col gap-2 border-b p-6'>
              <Skeleton className='h-5 w-40' />
              <Skeleton className='h-4 w-64' />
            </div>
            <div className='grid gap-5 p-6 sm:grid-cols-2'>
              {Array.from({ length: 9 }, (_, index) => (
                <FieldSkeleton key={index} />
              ))}
            </div>
            <div className='bg-muted/50 flex justify-end gap-2 border-t p-6'>
              <Skeleton className='h-9 w-20 rounded-lg' />
              <Skeleton className='h-9 w-28 rounded-lg' />
            </div>
          </div>
          <div className='flex flex-col gap-4'>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-32 w-full rounded-2xl' />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
