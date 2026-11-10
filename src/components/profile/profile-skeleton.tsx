import { FieldSkeleton, PageHeaderSkeleton, SkeletonRegion } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

export function ProfilePageSkeleton() {
  return (
    <SkeletonRegion className='mx-auto flex w-full max-w-3xl flex-col gap-8'>
      <PageHeaderSkeleton hasEyebrow hasDescription />
      <div className='flex flex-col gap-6'>
        <div className='bg-brand-black flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-8'>
          <Skeleton className='bg-brand-white/15 size-20 shrink-0 rounded-full' />
          <div className='flex flex-col gap-2.5'>
            <div className='flex items-center gap-2'>
              <Skeleton className='bg-brand-white/15 h-7 w-44' />
              <Skeleton className='bg-brand-white/15 h-5 w-14 rounded-full' />
            </div>
            <Skeleton className='bg-brand-white/10 h-4 w-56' />
          </div>
        </div>

        <div className='overflow-hidden rounded-xl border'>
          <div className='flex flex-col gap-2 border-b p-6'>
            <Skeleton className='h-5 w-40' />
            <Skeleton className='h-4 w-64' />
          </div>
          <div className='grid gap-5 p-6 sm:grid-cols-2'>
            {Array.from({ length: 7 }, (_, index) => (
              <FieldSkeleton key={index} />
            ))}
            <FieldSkeleton className='sm:col-span-2' />
          </div>
          <div className='bg-muted/50 flex justify-end gap-2 border-t p-6'>
            <Skeleton className='h-9 w-20 rounded-lg' />
            <Skeleton className='h-9 w-28 rounded-full' />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
