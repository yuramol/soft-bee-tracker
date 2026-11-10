import { PageHeaderSkeleton, SkeletonRegion, TabsSkeleton } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function ProjectsPageSkeleton() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton hasEyebrow hasDescription hasAction />
      <div className='flex flex-col gap-5'>
        <TabsSkeleton />
        <ProjectGridSkeleton />
      </div>
    </SkeletonRegion>
  );
}

export function ProjectGridSkeleton({ cards = 6 }: ProjectGridSkeletonProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className='flex flex-col gap-4 rounded-2xl border p-5'>
          <div className='flex items-center gap-3'>
            <Skeleton className='size-11 shrink-0 rounded-xl' />
            <div className='flex flex-1 flex-col gap-2'>
              <Skeleton className='h-4 w-1/2' />
              <Skeleton className='h-3.5 w-1/3' />
            </div>
            <Skeleton className='size-7 rounded-lg' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-3.5 w-full' />
            <Skeleton className='h-3.5 w-3/4' />
          </div>
          <div className='mt-auto flex items-center justify-between gap-2'>
            <Skeleton className='h-5 w-16 rounded-full' />
            <Skeleton className='h-3 w-28' />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProjectGridSkeletonProps {
  cards?: number;
}
