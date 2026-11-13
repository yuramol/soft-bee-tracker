import { FieldSkeleton, PageHeaderSkeleton, SkeletonRegion } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function ProjectsPageSkeleton() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton hasAction />
      <div className='flex flex-col gap-6'>
        <div className='grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:max-w-4xl'>
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }, (_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className='grid gap-3 rounded-2xl border p-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] lg:items-center lg:gap-x-6'>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-5 w-40' />
        <Skeleton className='h-4 w-64 max-w-full' />
      </div>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-36' />
        <Skeleton className='h-4 w-24' />
      </div>
      <div className='flex items-center justify-between gap-4'>
        <Skeleton className='h-5 w-14 rounded-full' />
        <Skeleton className='h-9 w-32 rounded-lg' />
      </div>
    </div>
  );
}
