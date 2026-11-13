import { SkeletonRegion } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

// the route's loading file shows the back link placeholder; the profile itself
// renders under a real back link, so it leaves it out
export function MemberProfileSkeleton({ hasBackLink = true }: MemberProfileSkeletonProps) {
  return (
    <SkeletonRegion className='flex flex-col gap-6'>
      {hasBackLink ? <Skeleton className='h-4 w-28' /> : null}
      <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-12 xl:grid-cols-[minmax(0,1fr)_24rem]'>
        <div className='flex flex-col gap-6 rounded-2xl border p-5 sm:p-8'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-center'>
            <Skeleton className='size-24 shrink-0 rounded-full sm:size-28' />
            <div className='flex flex-col gap-2.5'>
              <Skeleton className='h-8 w-56' />
              <Skeleton className='h-4 w-32' />
              <div className='flex gap-2'>
                <Skeleton className='h-5 w-14 rounded-full' />
                <Skeleton className='h-5 w-14 rounded-full' />
              </div>
            </div>
          </div>
          <div className='grid gap-x-8 gap-y-5 border-t pt-6 sm:grid-cols-2'>
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className='flex items-start gap-3'>
                <Skeleton className='size-9 shrink-0 rounded-lg' />
                <div className='flex flex-1 flex-col gap-1.5'>
                  <Skeleton className='h-3 w-20' />
                  <Skeleton className='h-4 w-3/4' />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='flex flex-col gap-4 rounded-2xl border p-4 sm:p-5'>
          <Skeleton className='h-11 w-full rounded-full' />
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <Skeleton className='size-4 rounded' />
                <div className='flex flex-col gap-1.5'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </div>
              <Skeleton className='h-5 w-14' />
            </div>
          ))}
          <div className='flex flex-col gap-2 border-t pt-4'>
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-14 w-full rounded-xl' />
            <Skeleton className='h-14 w-full rounded-xl' />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

interface MemberProfileSkeletonProps {
  hasBackLink?: boolean;
}
